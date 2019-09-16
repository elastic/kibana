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

import { Embeddable, APPLY_FILTER_TRIGGER } from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { start } from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import { onlyDisabledFiltersChanged } from '../../../../../../src/legacy/core_plugins/data/public';

import { I18nContext } from 'ui/i18n';

import { GisMap } from '../connected_components/gis_map';
import { createMapStore } from '../reducers/store';
import {
  setGotoWithCenter,
  replaceLayerList,
  setQuery,
  setRefreshConfig,
  disableScrollZoom,
} from '../actions/map_actions';
import {
  setReadOnly,
  setIsLayerTOCOpen,
  setOpenTOCDetails,
} from '../actions/ui_actions';
import { getIsLayerTOCOpen, getOpenTOCDetails } from '../selectors/ui_selectors';
import { getInspectorAdapters } from '../reducers/non_serializable_instances';
import { getMapCenter, getMapZoom } from '../selectors/map_selectors';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';

export class MapEmbeddable extends Embeddable {
  type = MAP_SAVED_OBJECT_TYPE;

  constructor(config, initialInput, parent) {
    super(
      initialInput,
      {
        editUrl: config.editUrl,
        indexPatterns: config.indexPatterns,
        editable: config.editable,
        defaultTitle: config.title
      },
      parent);

    this._layerList = config.layerList;
    this._store = createMapStore();

    this._subscription = this.getInput$().subscribe((input) => this.onContainerStateChanged(input));
  }

  getInspectorAdapters() {
    return getInspectorAdapters(this._store.getState());
  }

  onContainerStateChanged(containerState) {
    if (!_.isEqual(containerState.timeRange, this._prevTimeRange) ||
        !_.isEqual(containerState.query, this._prevQuery) ||
        !onlyDisabledFiltersChanged(containerState.filters, this._prevFilters)) {
      this._dispatchSetQuery(containerState);
    }

    if (!_.isEqual(containerState.refreshConfig, this._prevRefreshConfig)) {
      this._dispatchSetRefreshConfig(containerState);
    }
  }

  _dispatchSetQuery({ query, timeRange, filters }) {
    this._prevTimeRange = timeRange;
    this._prevQuery = query;
    this._prevFilters = filters;
    this._store.dispatch(setQuery({
      filters: filters.filter(filter => !filter.meta.disabled),
      query,
      timeFilters: timeRange,
    }));
  }

  _dispatchSetRefreshConfig({ refreshConfig }) {
    this._prevRefreshConfig = refreshConfig;
    this._store.dispatch(setRefreshConfig({
      isPaused: refreshConfig.pause,
      interval: refreshConfig.value,
    }));
  }

  /**
   *
   * @param {HTMLElement} domNode
   * @param {ContainerState} containerState
   */
  render(domNode) {
    this._store.dispatch(setReadOnly(true));
    this._store.dispatch(disableScrollZoom());

    if (_.has(this.input, 'isLayerTOCOpen')) {
      this._store.dispatch(setIsLayerTOCOpen(this.input.isLayerTOCOpen));
    }

    if (_.has(this.input, 'openTOCDetails')) {
      this._store.dispatch(setOpenTOCDetails(this.input.openTOCDetails));
    }

    if (this.input.mapCenter) {
      this._store.dispatch(setGotoWithCenter({
        lat: this.input.mapCenter.lat,
        lon: this.input.mapCenter.lon,
        zoom: this.input.mapCenter.zoom,
      }));
    }

    this._store.dispatch(replaceLayerList(this._layerList));
    this._dispatchSetQuery(this.input);
    this._dispatchSetRefreshConfig(this.input);

    this._domNode = domNode;

    render(
      <Provider store={this._store}>
        <I18nContext>
          <GisMap addFilters={this.input.hideFilterActions ? null : this.addFilters}/>
        </I18nContext>
      </Provider>,
      this._domNode
    );

    this._unsubscribeFromStore = this._store.subscribe(() => {
      this._handleStoreChanges();
    });
  }

  addFilters = filters => {
    start.executeTriggerActions(APPLY_FILTER_TRIGGER, {
      embeddable: this,
      triggerContext: {
        filters,
      },
    });
  }

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
      filters: this._prevFilters
    });
  }

  _handleStoreChanges() {

    const center = getMapCenter(this._store.getState());
    const zoom = getMapZoom(this._store.getState());


    const mapCenter = this.input.mapCenter || {};
    if (!mapCenter
      || mapCenter.lat !== center.lat
      || mapCenter.lon !== center.lon
      || mapCenter.zoom !== zoom) {
      this.updateInput({
        mapCenter: {
          lat: center.lat,
          lon: center.lon,
          zoom: zoom,
        }
      });
    }

    const isLayerTOCOpen = getIsLayerTOCOpen(this._store.getState());
    if (this.input.isLayerTOCOpen !== isLayerTOCOpen) {
      this.updateInput({
        isLayerTOCOpen
      });
    }

    const openTOCDetails = getOpenTOCDetails(this._store.getState());
    if (!_.isEqual(this.input.openTOCDetails, openTOCDetails)) {
      this.updateInput({
        openTOCDetails
      });
    }
  }
}
