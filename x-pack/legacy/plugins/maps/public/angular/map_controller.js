/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Subscription } from 'rxjs';
import chrome from 'ui/chrome';
import 'ui/directives/listen';
import 'ui/directives/storage';
import React from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { capabilities } from 'ui/capabilities';
import { render, unmountComponentAtNode } from 'react-dom';
import { uiModules } from 'ui/modules';
import { timefilter } from 'ui/timefilter';
import { Provider } from 'react-redux';
import { createMapStore } from '../reducers/store';
import { GisMap } from '../connected_components/gis_map';
import { addHelpMenuToAppChrome } from '../help_menu_util';
import {
  setSelectedLayer,
  setRefreshConfig,
  setGotoWithCenter,
  replaceLayerList,
  setQuery,
  clearTransientLayerStateAndCloseFlyout,
} from '../actions/map_actions';
import { DEFAULT_IS_LAYER_TOC_OPEN, FLYOUT_STATE } from '../reducers/ui';
import {
  enableFullScreen,
  updateFlyout,
  setReadOnly,
  setIsLayerTOCOpen,
  setOpenTOCDetails,
} from '../actions/ui_actions';
import { getIsFullScreen } from '../selectors/ui_selectors';
import { copyPersistentState } from '../reducers/util';
import {
  getQueryableUniqueIndexPatternIds,
  hasDirtyState,
  getLayerListRaw,
} from '../selectors/map_selectors';
import { getInspectorAdapters } from '../reducers/non_serializable_instances';
import { docTitle } from 'ui/doc_title';
import { indexPatternService, getInspector } from '../kibana_services';
import { toastNotifications } from 'ui/notify';
import { getInitialLayers } from './get_initial_layers';
import { getInitialQuery } from './get_initial_query';
import { MAP_SAVED_OBJECT_TYPE, MAP_APP_PATH } from '../../common/constants';
import { npStart } from 'ui/new_platform';
import { esFilters } from '../../../../../../src/plugins/data/public';
import {
  SavedObjectSaveModal,
  showSaveModal,
} from '../../../../../../src/plugins/saved_objects/public';

const REACT_ANCHOR_DOM_ELEMENT_ID = 'react-maps-root';

const app = uiModules.get(MAP_APP_PATH, []);

app.controller(
  'GisMapController',
  ($scope, $route, kbnUrl, localStorage, AppState, globalState) => {
    const { filterManager } = npStart.plugins.data.query;
    const savedMap = $route.current.locals.map;
    const mapState = savedMap && savedMap.mapStateJSON ? JSON.parse(savedMap.mapStateJSON) : null;
    $scope.screenTitle = savedMap.title;
    let unsubscribe;
    let initialLayerListConfig;
    const $state = ($scope.state = new AppState());
    const store = createMapStore();

    const onQueryChange = _.debounce((forceRefresh = false) => {
      console.log('onQueryChange');
      $scope.$evalAsync(() => {
        // appState
        $state.filters = filterManager.getAppFilters();
        $state.save();

        // globalState
        // globalState time and refreshInterval are manageded by timefilter
        globalState.filters = filterManager.getGlobalFilters();
        globalState.save();
      });

      store.dispatch(
        setQuery({
          filters: filterManager.getFilters(),
          query: $state.query,
          timeFilters: timefilter.getTime(),
          refresh: forceRefresh,
        })
      );
    }, 100);

    const subscriptions = new Subscription();
    subscriptions.add(
      timefilter.getRefreshIntervalUpdate$().subscribe({
        next: () => {
          console.log('getRefreshIntervalUpdate$');
          store.dispatch(
            setRefreshConfig({
              isPaused: timefilter.getRefreshInterval().pause,
              refreshInterval: timefilter.getRefreshInterval().value,
            })
          );
        },
      })
    );
    subscriptions.add(
      filterManager.getUpdates$().subscribe({
        next: () => {
          console.log('filterManager.getUpdates$');
          onQueryChange();
        },
      })
    );

    $scope.$listen($state, 'fetch_with_changes', function(diff) {
      if (diff.includes('filters')) {
        filterManager.setFilters([...globalState.filters, ..._.get($state, 'filters', [])]);
      }
      if (diff.includes('query')) {
        onQueryChange();
      }
    });

    $state.query = getInitialQuery({
      mapStateJSON: savedMap.mapStateJSON,
      appState: $state,
      userQueryLanguage: localStorage.get('kibana.userQueryLanguage'),
    });
    if (mapState) {
      if (mapState.timeFilters) {
        timefilter.setTime(mapState.timeFilters);
      }
      if (mapState.refreshConfig) {
        timefilter.setRefreshInterval({
          pause: mapState.refreshConfig.isPaused,
          value: mapState.refreshConfig.interval,
        });
      }
      if (mapState.filters) {
        addFilters(mapState.filters);
      }
    }

    /* Saved Queries */
    $scope.showSaveQuery = capabilities.get().maps.saveQuery;

    $scope.$watch(
      () => capabilities.get().maps.saveQuery,
      newCapability => {
        $scope.showSaveQuery = newCapability;
      }
    );

    $scope.updateSavedQueryId = newSavedQueryId => {
      if (newSavedQueryId) {
        $state.savedQuery = newSavedQueryId;
      } else {
        delete $state.savedQuery;
      }
      $state.save();
    };
    /* End of Saved Queries */

    $scope.indexPatterns = [];
    $scope.onQuerySubmit = function({ query }, isUpdate) {
      console.log('onQuerySubmit');
      $state.query = query;
      const isRefresh = !isUpdate;
      onQueryChange(isRefresh);
    };

    function addFilters(newFilters) {
      newFilters.forEach(filter => {
        filter.$state = esFilters.FilterStateStore.APP_STATE;
      });
      filterManager.addFilters(newFilters);
    }

    function hasUnsavedChanges() {
      const state = store.getState();
      const layerList = getLayerListRaw(state);
      const layerListConfigOnly = copyPersistentState(layerList);

      const savedLayerList = savedMap.getLayerList();
      const oldConfig = savedLayerList ? savedLayerList : initialLayerListConfig;

      return !_.isEqual(layerListConfigOnly, oldConfig);
    }

    function isOnMapNow() {
      return window.location.hash.startsWith(`#/${MAP_SAVED_OBJECT_TYPE}`);
    }

    function beforeUnload(event) {
      if (!isOnMapNow()) {
        return;
      }

      const hasChanged = hasUnsavedChanges();
      if (hasChanged) {
        event.preventDefault();
        event.returnValue = 'foobar'; //this is required for Chrome
      }
    }
    window.addEventListener('beforeunload', beforeUnload);

    async function renderMap() {
      // clear old UI state
      store.dispatch(setSelectedLayer(null));
      store.dispatch(updateFlyout(FLYOUT_STATE.NONE));
      store.dispatch(setReadOnly(!capabilities.get().maps.save));

      handleStoreChanges(store);
      unsubscribe = store.subscribe(() => {
        handleStoreChanges(store);
      });

      if (mapState) {
        store.dispatch(
          setGotoWithCenter({
            lat: mapState.center.lat,
            lon: mapState.center.lon,
            zoom: mapState.zoom,
          })
        );
      }

      if (savedMap.uiStateJSON) {
        const uiState = JSON.parse(savedMap.uiStateJSON);
        store.dispatch(
          setIsLayerTOCOpen(_.get(uiState, 'isLayerTOCOpen', DEFAULT_IS_LAYER_TOC_OPEN))
        );
        store.dispatch(setOpenTOCDetails(_.get(uiState, 'openTOCDetails', [])));
      }

      const layerList = getInitialLayers(savedMap.layerListJSON);
      initialLayerListConfig = copyPersistentState(layerList);
      store.dispatch(replaceLayerList(layerList));

      const root = document.getElementById(REACT_ANCHOR_DOM_ELEMENT_ID);
      render(
        <Provider store={store}>
          <I18nProvider>
            <GisMap addFilters={addFilters} />
          </I18nProvider>
        </Provider>,
        root
      );
    }
    renderMap();

    let prevIndexPatternIds;
    async function updateIndexPatterns(nextIndexPatternIds) {
      const indexPatterns = [];
      const getIndexPatternPromises = nextIndexPatternIds.map(async indexPatternId => {
        try {
          const indexPattern = await indexPatternService.get(indexPatternId);
          indexPatterns.push(indexPattern);
        } catch (err) {
          // unable to fetch index pattern
        }
      });

      await Promise.all(getIndexPatternPromises);
      // ignore outdated results
      if (prevIndexPatternIds !== nextIndexPatternIds) {
        return;
      }
      $scope.$evalAsync(() => {
        $scope.indexPatterns = indexPatterns;
      });
    }

    $scope.isFullScreen = false;
    $scope.isSaveDisabled = false;
    function handleStoreChanges(store) {
      const nextIsFullScreen = getIsFullScreen(store.getState());
      if (nextIsFullScreen !== $scope.isFullScreen) {
        // Must trigger digest cycle for angular top nav to redraw itself when isFullScreen changes
        $scope.$evalAsync(() => {
          $scope.isFullScreen = nextIsFullScreen;
        });
      }

      const nextIndexPatternIds = getQueryableUniqueIndexPatternIds(store.getState());
      if (nextIndexPatternIds !== prevIndexPatternIds) {
        prevIndexPatternIds = nextIndexPatternIds;
        updateIndexPatterns(nextIndexPatternIds);
      }

      const nextIsSaveDisabled = hasDirtyState(store.getState());
      if (nextIsSaveDisabled !== $scope.isSaveDisabled) {
        $scope.$evalAsync(() => {
          $scope.isSaveDisabled = nextIsSaveDisabled;
        });
      }
    }

    $scope.$on('$destroy', () => {
      subscriptions.unsubscribe();

      window.removeEventListener('beforeunload', beforeUnload);

      if (unsubscribe) {
        unsubscribe();
      }
      const node = document.getElementById(REACT_ANCHOR_DOM_ELEMENT_ID);
      if (node) {
        unmountComponentAtNode(node);
      }
    });

    const updateBreadcrumbs = () => {
      chrome.breadcrumbs.set([
        {
          text: i18n.translate('xpack.maps.mapController.mapsBreadcrumbLabel', {
            defaultMessage: 'Maps',
          }),
          onClick: () => {
            if (isOnMapNow() && hasUnsavedChanges()) {
              const navigateAway = window.confirm(
                i18n.translate('xpack.maps.mapController.unsavedChangesWarning', {
                  defaultMessage: `Your unsaved changes might not be saved`,
                })
              );
              if (navigateAway) {
                window.location.hash = '#';
              }
            } else {
              window.location.hash = '#';
            }
          },
        },
        { text: savedMap.title },
      ]);
    };
    updateBreadcrumbs();

    addHelpMenuToAppChrome(chrome);

    async function doSave(saveOptions) {
      await store.dispatch(clearTransientLayerStateAndCloseFlyout());
      savedMap.syncWithStore(store.getState());
      let id;

      try {
        id = await savedMap.save(saveOptions);
        docTitle.change(savedMap.title);
      } catch (err) {
        toastNotifications.addDanger({
          title: i18n.translate('xpack.maps.mapController.saveErrorMessage', {
            defaultMessage: `Error on saving '{title}'`,
            values: { title: savedMap.title },
          }),
          text: err.message,
          'data-test-subj': 'saveMapError',
        });
        return { error: err };
      }

      if (id) {
        toastNotifications.addSuccess({
          title: i18n.translate('xpack.maps.mapController.saveSuccessMessage', {
            defaultMessage: `Saved '{title}'`,
            values: { title: savedMap.title },
          }),
          'data-test-subj': 'saveMapSuccess',
        });

        updateBreadcrumbs();

        if (savedMap.id !== $route.current.params.id) {
          $scope.$evalAsync(() => {
            kbnUrl.change(`map/{{id}}`, { id: savedMap.id });
          });
        }
      }
      return { id };
    }

    // Hide angular timepicer/refresh UI from top nav
    $scope.showDatePicker = true; // used by query-bar directive to enable timepikcer in query bar
    $scope.topNavMenu = [
      {
        id: 'full-screen',
        label: i18n.translate('xpack.maps.mapController.fullScreenButtonLabel', {
          defaultMessage: `full screen`,
        }),
        description: i18n.translate('xpack.maps.mapController.fullScreenDescription', {
          defaultMessage: `full screen`,
        }),
        testId: 'mapsFullScreenMode',
        run() {
          store.dispatch(enableFullScreen());
        },
      },
      {
        id: 'inspect',
        label: i18n.translate('xpack.maps.mapController.openInspectorButtonLabel', {
          defaultMessage: `inspect`,
        }),
        description: i18n.translate('xpack.maps.mapController.openInspectorDescription', {
          defaultMessage: `Open Inspector`,
        }),
        testId: 'openInspectorButton',
        run() {
          const inspectorAdapters = getInspectorAdapters(store.getState());
          getInspector().open(inspectorAdapters, {});
        },
      },
      ...(capabilities.get().maps.save
        ? [
            {
              id: 'save',
              label: i18n.translate('xpack.maps.mapController.saveMapButtonLabel', {
                defaultMessage: `save`,
              }),
              description: i18n.translate('xpack.maps.mapController.saveMapDescription', {
                defaultMessage: `Save map`,
              }),
              testId: 'mapSaveButton',
              disableButton() {
                return $scope.isSaveDisabled;
              },
              tooltip() {
                if ($scope.isSaveDisabled) {
                  return i18n.translate('xpack.maps.mapController.saveMapDisabledButtonTooltip', {
                    defaultMessage: 'Save or Cancel your layer changes before saving',
                  });
                }
              },
              run: async () => {
                const onSave = ({
                  newTitle,
                  newCopyOnSave,
                  isTitleDuplicateConfirmed,
                  onTitleDuplicate,
                }) => {
                  const currentTitle = savedMap.title;
                  savedMap.title = newTitle;
                  savedMap.copyOnSave = newCopyOnSave;
                  const saveOptions = {
                    confirmOverwrite: false,
                    isTitleDuplicateConfirmed,
                    onTitleDuplicate,
                  };
                  return doSave(saveOptions).then(response => {
                    // If the save wasn't successful, put the original values back.
                    if (!response.id || response.error) {
                      savedMap.title = currentTitle;
                    }
                    return response;
                  });
                };

                const saveModal = (
                  <SavedObjectSaveModal
                    onSave={onSave}
                    onClose={() => {}}
                    title={savedMap.title}
                    showCopyOnSave={savedMap.id ? true : false}
                    objectType={MAP_SAVED_OBJECT_TYPE}
                  />
                );
                showSaveModal(saveModal, npStart.core.i18n.Context);
              },
            },
          ]
        : []),
    ];
  }
);
