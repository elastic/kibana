/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import _ from 'lodash';
import { finalize, switchMap, tap } from 'rxjs';
import { i18n } from '@kbn/i18n';
import {
  AppLeaveAction,
  AppMountParameters,
  KibanaExecutionContext,
  ScopedHistory,
} from '@kbn/core/public';
import { Adapters } from '@kbn/inspector-plugin/public';
import { Subscription } from 'rxjs';
import { type Filter, FilterStateStore, type Query, type TimeRange } from '@kbn/es-query';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-plugin/common';
import {
  GlobalQueryStateFromUrl,
  QueryState,
  QueryStateChange,
  SavedQuery,
  syncGlobalQueryStateWithUrl,
} from '@kbn/data-plugin/public';
import {
  createKbnUrlStateStorage,
  withNotifyOnErrors,
  IKbnUrlStateStorage,
} from '@kbn/kibana-utils-plugin/public';
import { getManagedContentBadge } from '@kbn/managed-content-badge';
import {
  getData,
  getExecutionContextService,
  getCoreChrome,
  getIndexPatternService,
  getNavigation,
  getSpacesApi,
  getTimeFilter,
  getToasts,
} from '../../../kibana_services';
import { AppStateManager, startAppStateSyncing } from '../url_state';
import { MapContainer } from '../../../connected_components/map_container';
import { getIndexPatternsFromIds } from '../../../index_pattern_util';
import { getTopNavConfig } from '../top_nav_config';
import {
  getEditPath,
  getFullPath,
  APP_ID,
  MAP_EMBEDDABLE_NAME,
} from '../../../../common/constants';
import {
  getInitialQuery,
  getInitialRefreshConfig,
  SavedMap,
  unsavedChangesTitle,
  unsavedChangesWarning,
} from '../saved_map';
import { waitUntilTimeLayersLoad$ } from './wait_until_time_layers_load';
import { RefreshConfig as MapRefreshConfig, ParsedMapStateJSON } from '../saved_map';

export interface Props {
  savedMap: SavedMap;
  // saveCounter used to trigger MapApp render after SaveMap.save
  saveCounter: number;
  onAppLeave: AppMountParameters['onAppLeave'];
  filters: Filter[];
  isFullScreen: boolean;
  isOpenSettingsDisabled: boolean;
  enableFullScreen: () => void;
  openMapSettings: () => void;
  inspectorAdapters: Adapters;
  nextIndexPatternIds: string[];
  setQuery: ({
    forceRefresh,
    filters,
    query,
    timeFilters,
    searchSessionId,
  }: {
    filters?: Filter[];
    query?: Query;
    timeFilters?: TimeRange;
    forceRefresh?: boolean;
    searchSessionId?: string;
  }) => void;
  timeFilters: TimeRange;
  isSaveDisabled: boolean;
  query: Query | undefined;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  history: ScopedHistory;
  setExecutionContext: (executionContext: KibanaExecutionContext) => void;
}

export interface State {
  initialized: boolean;
  indexPatterns: DataView[];
  savedQuery?: SavedQuery;
  isRefreshPaused: boolean;
  refreshInterval: number;
}

export class MapApp extends React.Component<Props, State> {
  _autoRefreshSubscription: Subscription | null = null;
  _globalSyncUnsubscribe: (() => void) | null = null;
  _globalSyncChangeMonitorSubscription: Subscription | null = null;
  _appSyncUnsubscribe: (() => void) | null = null;
  _appStateManager = new AppStateManager();
  _prevIndexPatternIds: string[] | null = null;
  _isMounted: boolean = false;
  _kbnUrlStateStorage: IKbnUrlStateStorage;
  _initialTimeFromUrl: TimeRange | undefined;

  constructor(props: Props) {
    super(props);
    this.state = {
      indexPatterns: [],
      initialized: false,
      isRefreshPaused: true,
      refreshInterval: 0,
    };
    this._kbnUrlStateStorage = createKbnUrlStateStorage({
      useHash: false,
      history: props.history,
      ...withNotifyOnErrors(getToasts()),
    });
  }

  componentDidMount() {
    this._isMounted = true;

    const executionContext = {
      type: 'application',
      name: APP_ID,
      url: window.location.pathname,
      id: this.props.savedMap.getSavedObjectId() || 'new',
      page: 'editor',
    };
    getExecutionContextService().set(executionContext); // set execution context in core ExecutionContextStartService
    this.props.setExecutionContext(executionContext); // set execution context in redux store

    this._autoRefreshSubscription = getTimeFilter()
      .getAutoRefreshFetch$()
      .pipe(
        tap(() => {
          this.props.setQuery({ forceRefresh: true });
        }),
        switchMap((done) =>
          waitUntilTimeLayersLoad$(this.props.savedMap.getStore()).pipe(finalize(done))
        )
      )
      .subscribe();

    // syncGlobalQueryStateWithUrl mutates global state by merging URL state with Kibana QueryStart state
    // capture _initialTimeFromUrl before global state is mutated
    this._initialTimeFromUrl = this._getGlobalState()?.time;
    const { stop } = syncGlobalQueryStateWithUrl(getData().query, this._kbnUrlStateStorage);
    this._globalSyncUnsubscribe = stop;

    this._appSyncUnsubscribe = startAppStateSyncing(
      this._appStateManager,
      this._kbnUrlStateStorage
    );
    this._globalSyncChangeMonitorSubscription = getData().query.state$.subscribe(
      this._updateFromGlobalState
    );

    // savedQuery must be fetched from savedQueryId
    // const initialSavedQuery = this._appStateManager.getAppState().savedQuery;
    // if (initialSavedQuery) {
    //   this._updateStateFromSavedQuery(initialSavedQuery as SavedQuery);
    // }

    this._initMap();

    this.props.onAppLeave((actions) => {
      if (this.props.savedMap.hasUnsavedChanges()) {
        return actions.confirm(unsavedChangesWarning, unsavedChangesTitle);
      }
      return actions.default() as AppLeaveAction;
    });
  }

  componentDidUpdate() {
    this._updateIndexPatterns();
  }

  componentWillUnmount() {
    this._isMounted = false;

    if (this._autoRefreshSubscription) {
      this._autoRefreshSubscription.unsubscribe();
    }
    if (this._globalSyncUnsubscribe) {
      this._globalSyncUnsubscribe();
    }
    if (this._appSyncUnsubscribe) {
      this._appSyncUnsubscribe();
    }
    if (this._globalSyncChangeMonitorSubscription) {
      this._globalSyncChangeMonitorSubscription.unsubscribe();
    }

    this.props.onAppLeave((actions) => {
      return actions.default();
    });
  }

  _updateFromGlobalState = ({
    changes,
    state: globalState,
  }: {
    changes: QueryStateChange;
    state: QueryState;
  }) => {
    if (!this.state.initialized || !changes || !globalState) {
      return;
    }

    this._onQueryChange({ time: globalState.time });
  };

  _getGlobalState() {
    return this._kbnUrlStateStorage.get<GlobalQueryStateFromUrl>('_g') ?? {};
  }

  _updateGlobalState(newState: GlobalQueryStateFromUrl) {
    this._kbnUrlStateStorage.set('_g', {
      ...this._getGlobalState(),
      ...newState,
    });
    if (!this.state.initialized) {
      this._kbnUrlStateStorage.kbnUrlControls.flush(true);
    }
  }

  async _updateIndexPatterns() {
    const { nextIndexPatternIds } = this.props;

    if (_.isEqual(nextIndexPatternIds, this._prevIndexPatternIds)) {
      return;
    }

    this._prevIndexPatternIds = nextIndexPatternIds;

    let indexPatterns: DataView[] = [];
    if (nextIndexPatternIds.length === 0) {
      // Use default data view to always show filter bar when filters are present
      // Example scenario, global state has pinned filters and new map is created
      const defaultDataView = await getIndexPatternService().getDefaultDataView();
      if (defaultDataView) {
        indexPatterns = [defaultDataView];
      }
    } else {
      indexPatterns = await getIndexPatternsFromIds(nextIndexPatternIds);
    }

    if (!this._isMounted) {
      return;
    }

    // ignore results for outdated requests
    if (!_.isEqual(nextIndexPatternIds, this._prevIndexPatternIds)) {
      return;
    }

    this.setState({ indexPatterns });
  }

  _onQueryChange = ({
    filters,
    query,
    time,
  }: {
    filters?: Filter[];
    query?: Query;
    time?: TimeRange;
  }) => {
    const { filterManager } = getData().query;

    if (filters) {
      filterManager.setFilters(filters);
    }

    this.props.setQuery({
      forceRefresh: false,
      filters: filterManager.getFilters(),
      query,
      timeFilters: time,
    });

    // sync appState
    this._appStateManager.setQueryAndFilters({
      filters: filterManager.getAppFilters(),
      query,
    });

    // sync globalState
    const updatedGlobalState: GlobalQueryStateFromUrl = {
      filters: filterManager.getGlobalFilters(),
    };
    if (time) {
      updatedGlobalState.time = time;
    }
    this._updateGlobalState(updatedGlobalState);
  };

  _getInitialTime(mapState?: ParsedMapStateJSON) {
    if (this._initialTimeFromUrl) {
      return this._initialTimeFromUrl;
    }

    return !this.props.savedMap.hasSaveAndReturnConfig() && mapState?.timeFilters
      ? mapState.timeFilters
      : getTimeFilter().getTime();
  }

  _initMapAndLayerSettings(mapState?: ParsedMapStateJSON) {
    const globalState = this._getGlobalState();

    const savedObjectFilters = mapState?.filters ? mapState.filters : [];
    const appFilters = this._appStateManager.getFilters() || [];

    const query = getInitialQuery({
      mapState,
      appState: this._appStateManager.getAppState(),
    });
    if (query) {
      getData().query.queryString.setQuery(query);
    }

    this._onQueryChange({
      filters: [..._.get(globalState, 'filters', []), ...appFilters, ...savedObjectFilters],
      query,
      time: this._getInitialTime(mapState),
    });

    this._onRefreshConfigChange(
      getInitialRefreshConfig({
        mapState,
        globalState,
      })
    );
  }

  _onFiltersChange = (filters: Filter[]) => {
    this._onQueryChange({
      filters,
    });
  };

  _onRefreshConfigChange({ isPaused, interval }: MapRefreshConfig) {
    this.setState({
      isRefreshPaused: isPaused,
      refreshInterval: interval,
    });
    this._updateGlobalState({
      refreshInterval: {
        pause: isPaused,
        value: interval,
      },
    });
  }

  _updateStateFromSavedQuery = (savedQuery: SavedQuery) => {
    this.setState({ savedQuery: { ...savedQuery } });
    this._appStateManager.setQueryAndFilters({ savedQueryId: savedQuery.id });

    const { filterManager } = getData().query;
    const savedQueryFilters = savedQuery.attributes.filters || [];
    const globalFilters = filterManager.getGlobalFilters();
    const allFilters = [...savedQueryFilters, ...globalFilters];

    const refreshInterval = _.get(savedQuery, 'attributes.timefilter.refreshInterval');
    if (refreshInterval) {
      this._onRefreshConfigChange({
        isPaused: refreshInterval.pause,
        interval: refreshInterval.value,
      });
    }
    this._onQueryChange({
      filters: allFilters,
      query: savedQuery.attributes.query,
      time: savedQuery.attributes.timefilter,
    });
  };

  async _initMap() {
    // Handle redirect with adhoc data view spec provided via history location state (MAPS_APP_LOCATOR)
    const historyLocationState = this.props.history.location?.state as
      | {
          dataViewSpec: DataViewSpec;
        }
      | undefined;
    if (historyLocationState?.dataViewSpec?.id) {
      const dataViewService = getIndexPatternService();
      try {
        const dataView = await dataViewService.get(historyLocationState.dataViewSpec.id);
        if (!dataView.isPersisted()) {
          await dataViewService.create(historyLocationState.dataViewSpec);
        }
      } catch (error) {
        // ignore errors, not a critical error for viewing map - layer(s) using data view will surface error
      }
    }

    try {
      await this.props.savedMap.whenReady();
    } catch (err) {
      if (this._isMounted) {
        getToasts().addWarning({
          title: i18n.translate('xpack.maps.loadMap.errorAttemptingToLoadSavedMap', {
            defaultMessage: `Unable to load map`,
          }),
          text: `${err.message}`,
        });
        this.props.history.push('/');
      }
      return;
    }

    if (!this._isMounted) {
      return;
    }

    const sharingSavedObjectProps = this.props.savedMap.getSharingSavedObjectProps();
    const spaces = getSpacesApi();
    if (spaces && sharingSavedObjectProps?.outcome === 'aliasMatch') {
      // We found this object by a legacy URL alias from its old ID; redirect the user to the page with its new ID, preserving any URL hash
      const newObjectId = sharingSavedObjectProps.aliasTargetId!; // This is always defined if outcome === 'aliasMatch'
      const newPath = `${getEditPath(newObjectId)}${this.props.history.location.hash}`;
      await spaces.ui.redirectLegacyUrl({
        path: newPath,
        aliasPurpose: sharingSavedObjectProps.aliasPurpose,
        objectNoun: MAP_EMBEDDABLE_NAME,
      });
      return;
    }

    this.props.savedMap.setBreadcrumbs(this.props.history);
    getCoreChrome().docTitle.change(this.props.savedMap.getTitle());
    const savedObjectId = this.props.savedMap.getSavedObjectId();
    if (savedObjectId) {
      getCoreChrome().recentlyAccessed.add(
        getFullPath(savedObjectId),
        this.props.savedMap.getTitle(),
        savedObjectId
      );
    }

    let mapState: ParsedMapStateJSON | undefined;
    try {
      const attributes = this.props.savedMap.getAttributes();
      if (attributes.mapStateJSON) {
        mapState = JSON.parse(attributes.mapStateJSON);
      }
    } catch (e) {
      // ignore malformed mapStateJSON, not a critical error for viewing map - map will just use defaults
    }
    this._initMapAndLayerSettings(mapState);

    this.setState({ initialized: true });
  }

  _renderTopNav() {
    if (this.props.isFullScreen) {
      return null;
    }

    const topNavConfig = getTopNavConfig({
      savedMap: this.props.savedMap,
      isOpenSettingsDisabled: this.props.isOpenSettingsDisabled,
      isSaveDisabled: this.props.isSaveDisabled,
      enableFullScreen: this.props.enableFullScreen,
      openMapSettings: this.props.openMapSettings,
      inspectorAdapters: this.props.inspectorAdapters,
      history: this.props.history,
    });

    const { TopNavMenu } = getNavigation().ui;
    return (
      <TopNavMenu
        setMenuMountPoint={this.props.setHeaderActionMenu}
        appName={APP_ID}
        badges={
          this.props.savedMap.isManaged()
            ? [
                getManagedContentBadge(
                  i18n.translate('xpack.maps.mapController.managedMapDescriptionTooltip', {
                    defaultMessage: 'Elastic manages this map. Save any changes to a new map.',
                  })
                ),
              ]
            : undefined
        }
        config={topNavConfig}
        indexPatterns={this.state.indexPatterns}
        filters={this.props.filters}
        query={this.props.query}
        onQuerySubmit={({ dateRange, query }) => {
          const isUpdate =
            !_.isEqual(dateRange, this.props.timeFilters) || !_.isEqual(query, this.props.query);
          if (isUpdate) {
            this._onQueryChange({
              query,
              time: dateRange,
            });
          } else {
            this.props.setQuery({ forceRefresh: true });
          }
        }}
        onFiltersUpdated={this._onFiltersChange}
        dateRangeFrom={this.props.timeFilters.from}
        dateRangeTo={this.props.timeFilters.to}
        isRefreshPaused={this.state.isRefreshPaused}
        refreshInterval={this.state.refreshInterval}
        onRefreshChange={({
          isPaused,
          refreshInterval,
        }: {
          isPaused: boolean;
          refreshInterval: number;
        }) => {
          this._onRefreshConfigChange({
            isPaused,
            interval: refreshInterval,
          });
        }}
        showSearchBar={true}
        showFilterBar={true}
        showDatePicker={true}
        allowSavingQueries
        savedQuery={this.state.savedQuery}
        onSaved={this._updateStateFromSavedQuery}
        onSavedQueryUpdated={this._updateStateFromSavedQuery}
        onClearSavedQuery={() => {
          const { filterManager, queryString } = getData().query;
          this.setState({ savedQuery: undefined });
          this._appStateManager.setQueryAndFilters({ savedQueryId: '' });
          this._onQueryChange({
            filters: filterManager.getGlobalFilters(),
            query: queryString.getDefaultQuery(),
          });
        }}
      />
    );
  }

  _addFilter = async (newFilters: Filter[]) => {
    newFilters.forEach((filter) => {
      filter.$state = { store: FilterStateStore.APP_STATE };
    });
    this._onFiltersChange([...this.props.filters, ...newFilters]);
  };

  _renderLegacyUrlConflict() {
    const sharingSavedObjectProps = this.props.savedMap.getSharingSavedObjectProps();
    const spaces = getSpacesApi();
    return spaces && sharingSavedObjectProps?.outcome === 'conflict'
      ? spaces.ui.components.getLegacyUrlConflict({
          objectNoun: MAP_EMBEDDABLE_NAME,
          currentObjectId: this.props.savedMap.getSavedObjectId()!,
          otherObjectId: sharingSavedObjectProps.aliasTargetId!,
          otherObjectPath: `${getEditPath(sharingSavedObjectProps.aliasTargetId!)}${
            this.props.history.location.hash
          }`,
        })
      : null;
  }

  render() {
    if (!this.state.initialized) {
      return null;
    }

    return (
      <div id="maps-plugin" className={this.props.isFullScreen ? 'mapFullScreen' : ''}>
        {this._renderTopNav()}
        <h1 className="euiScreenReaderOnly">{`screenTitle placeholder`}</h1>
        <div id="react-maps-root">
          {this._renderLegacyUrlConflict()}
          <MapContainer
            addFilters={this._addFilter}
            title={this.props.savedMap.getAttributes().title}
            description={this.props.savedMap.getAttributes().description}
            waitUntilTimeLayersLoad$={waitUntilTimeLayersLoad$(this.props.savedMap.getStore())}
            isSharable
          />
        </div>
      </div>
    );
  }
}
