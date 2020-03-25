/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { Provider } from 'react-redux';
import { render, unmountComponentAtNode } from 'react-dom';
import 'mapbox-gl/dist/mapbox-gl.css';

import { I18nContext } from 'ui/i18n';
import { npStart } from 'ui/new_platform';
import { Subscription } from 'rxjs';
import { Unsubscribe } from 'redux';
import {
  Embeddable,
  IContainer,
  EmbeddableInput,
  EmbeddableOutput,
} from '../../../../../../src/plugins/embeddable/public';
import { APPLY_FILTER_TRIGGER } from '../../../../../../src/plugins/ui_actions/public';
import {
  esFilters,
  IIndexPattern,
  TimeRange,
  Filter,
  Query,
  RefreshInterval,
} from '../../../../../../src/plugins/data/public';

import { GisMap } from '../connected_components/gis_map';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { createMapStore, MapStore } from '../../../../../plugins/maps/public/reducers/store';
import {
  setGotoWithCenter,
  replaceLayerList,
  setQuery,
  setRefreshConfig,
  disableScrollZoom,
  disableInteractive,
  disableTooltipControl,
  hideToolbarOverlay,
  hideLayerControl,
  hideViewControl,
  setHiddenLayers,
  MapCenter,
} from '../actions/map_actions';
import { setReadOnly, setIsLayerTOCOpen, setOpenTOCDetails } from '../actions/ui_actions';
import { getIsLayerTOCOpen, getOpenTOCDetails } from '../selectors/ui_selectors';
import {
  getInspectorAdapters,
  setEventHandlers,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../plugins/maps/public/reducers/non_serializable_instances';
import { getMapCenter, getMapZoom, getHiddenLayerIds } from '../selectors/map_selectors';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';

interface MapConfig {
  editUrl?: string;
  indexPatterns: IIndexPattern[];
  editable: boolean;
  title?: string;
  layerList: unknown;
}

export interface MapInput extends EmbeddableInput {
  timeRange?: TimeRange;
  filters: Filter[];
  query?: Query;
  refresh: unknown;
  refreshConfig: RefreshInterval;
  isLayerTOCOpen: boolean;
  openTOCDetails: unknown;
  disableTooltipControl: boolean;
  disableInteractive: boolean;
  hideToolbarOverlay: boolean;
  hideLayerControl: boolean;
  hideViewControl: boolean;
  mapCenter: MapCenter;
  hiddenLayers: unknown;
  hideFilterActions: boolean;
}

export interface MapOutput extends EmbeddableOutput {
  indexPatterns: IIndexPattern[];
}

export class MapEmbeddable extends Embeddable<MapInput, MapOutput> {
  type = MAP_SAVED_OBJECT_TYPE;

  private _renderTooltipContent?: unknown;
  private _eventHandlers?: unknown;
  private _layerList: unknown;
  private _store: MapStore;
  private _subscription: Subscription;
  private _prevTimeRange?: TimeRange;
  private _prevQuery?: Query;
  private _prevRefreshConfig?: RefreshInterval;
  private _prevFilters?: Filter[];
  private _domNode?: HTMLElement;
  private _unsubscribeFromStore?: Unsubscribe;

  constructor(
    config: MapConfig,
    initialInput: MapInput,
    parent?: IContainer,
    renderTooltipContent?: unknown,
    eventHandlers?: unknown
  ) {
    super(
      initialInput,
      {
        editUrl: config.editUrl,
        indexPatterns: config.indexPatterns,
        editable: config.editable,
        defaultTitle: config.title,
      },
      parent
    );

    this._renderTooltipContent = renderTooltipContent;
    this._eventHandlers = eventHandlers;
    this._layerList = config.layerList;
    this._store = createMapStore();

    this._subscription = this.getInput$().subscribe(input => this.onContainerStateChanged(input));
  }

  getInspectorAdapters() {
    return getInspectorAdapters(this._store.getState());
  }

  onContainerStateChanged(containerState: MapInput) {
    if (
      !_.isEqual(containerState.timeRange, this._prevTimeRange) ||
      !_.isEqual(containerState.query, this._prevQuery) ||
      !esFilters.onlyDisabledFiltersChanged(containerState.filters, this._prevFilters)
    ) {
      this._dispatchSetQuery(containerState);
    }

    if (!_.isEqual(containerState.refreshConfig, this._prevRefreshConfig)) {
      this._dispatchSetRefreshConfig(containerState);
    }
  }

  _dispatchSetQuery({
    query,
    timeRange,
    filters,
    refresh,
  }: Pick<MapInput, 'query' | 'timeRange' | 'filters' | 'refresh'>) {
    this._prevTimeRange = timeRange;
    this._prevQuery = query;
    this._prevFilters = filters;
    this._store.dispatch(
      setQuery({
        filters: filters.filter(filter => !filter.meta.disabled),
        query,
        timeFilters: timeRange,
        refresh,
      })
    );
  }

  _dispatchSetRefreshConfig({ refreshConfig }: Pick<MapInput, 'refreshConfig'>) {
    this._prevRefreshConfig = refreshConfig;
    this._store.dispatch(
      setRefreshConfig({
        isPaused: refreshConfig.pause,
        interval: refreshConfig.value,
      })
    );
  }

  /**
   *
   * @param {HTMLElement} domNode
   * @param {ContainerState} containerState
   */
  render(domNode: HTMLElement) {
    this._store.dispatch(setEventHandlers(this._eventHandlers));
    this._store.dispatch(setReadOnly(true));
    this._store.dispatch(disableScrollZoom());

    if (_.has(this.input, 'isLayerTOCOpen')) {
      this._store.dispatch(setIsLayerTOCOpen(this.input.isLayerTOCOpen));
    }

    if (_.has(this.input, 'openTOCDetails')) {
      this._store.dispatch(setOpenTOCDetails(this.input.openTOCDetails));
    }

    if (_.has(this.input, 'disableInteractive') && this.input.disableInteractive) {
      this._store.dispatch(disableInteractive(this.input.disableInteractive));
    }

    if (_.has(this.input, 'disableTooltipControl') && this.input.disableTooltipControl) {
      this._store.dispatch(disableTooltipControl(this.input.disableTooltipControl));
    }
    if (_.has(this.input, 'hideToolbarOverlay') && this.input.hideToolbarOverlay) {
      this._store.dispatch(hideToolbarOverlay(this.input.hideToolbarOverlay));
    }

    if (_.has(this.input, 'hideLayerControl') && this.input.hideLayerControl) {
      this._store.dispatch(hideLayerControl(this.input.hideLayerControl));
    }

    if (_.has(this.input, 'hideViewControl') && this.input.hideViewControl) {
      this._store.dispatch(hideViewControl(this.input.hideViewControl));
    }

    if (this.input.mapCenter) {
      this._store.dispatch(
        setGotoWithCenter({
          lat: this.input.mapCenter.lat,
          lon: this.input.mapCenter.lon,
          zoom: this.input.mapCenter.zoom,
        })
      );
    }

    this._store.dispatch(replaceLayerList(this._layerList));
    if (this.input.hiddenLayers) {
      this._store.dispatch(setHiddenLayers(this.input.hiddenLayers));
    }
    this._dispatchSetQuery(this.input);
    this._dispatchSetRefreshConfig(this.input);

    this._domNode = domNode;

    render(
      <Provider store={this._store}>
        <I18nContext>
          <GisMap
            addFilters={this.input.hideFilterActions ? null : this.addFilters}
            renderTooltipContent={this._renderTooltipContent}
          />
        </I18nContext>
      </Provider>,
      this._domNode
    );

    this._unsubscribeFromStore = this._store.subscribe(() => {
      this._handleStoreChanges();
    });
  }

  async setLayerList(layerList: unknown) {
    this._layerList = layerList;
    return await this._store.dispatch(replaceLayerList(this._layerList));
  }

  addFilters = (filters: Filter[]) => {
    npStart.plugins.uiActions.executeTriggerActions(APPLY_FILTER_TRIGGER, {
      embeddable: this,
      filters,
    });
  };

  destroy() {
    super.destroy();
    if (this._unsubscribeFromStore) {
      this._unsubscribeFromStore();
    }

    if (this._domNode) {
      unmountComponentAtNode(this._domNode);
    }

    if (this._subscription) {
      this._subscription.unsubscribe();
    }
  }

  reload() {
    this._dispatchSetQuery({
      query: this._prevQuery,
      timeRange: this._prevTimeRange,
      filters: this._prevFilters ?? [],
      refresh: true,
    });
  }

  _handleStoreChanges() {
    const center = getMapCenter(this._store.getState());
    const zoom = getMapZoom(this._store.getState());

    const mapCenter = this.input.mapCenter || {};
    if (
      !mapCenter ||
      mapCenter.lat !== center.lat ||
      mapCenter.lon !== center.lon ||
      mapCenter.zoom !== zoom
    ) {
      this.updateInput({
        mapCenter: {
          lat: center.lat,
          lon: center.lon,
          zoom,
        },
      });
    }

    const isLayerTOCOpen = getIsLayerTOCOpen(this._store.getState());
    if (this.input.isLayerTOCOpen !== isLayerTOCOpen) {
      this.updateInput({
        isLayerTOCOpen,
      });
    }

    const openTOCDetails = getOpenTOCDetails(this._store.getState());
    if (!_.isEqual(this.input.openTOCDetails, openTOCDetails)) {
      this.updateInput({
        openTOCDetails,
      });
    }

    const hiddenLayerIds = getHiddenLayerIds(this._store.getState());

    if (!_.isEqual(this.input.hiddenLayers, hiddenLayerIds)) {
      this.updateInput({
        hiddenLayers: hiddenLayerIds,
      });
    }
  }
}
