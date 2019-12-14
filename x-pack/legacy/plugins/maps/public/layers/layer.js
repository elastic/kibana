/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import React from 'react';
import { EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import turf from 'turf';
import turfBooleanContains from '@turf/boolean-contains';
import { DataRequest } from './util/data_request';
import {
  MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER,
  SOURCE_DATA_ID_ORIGIN,
} from '../../common/constants';
import uuid from 'uuid/v4';
import { copyPersistentState } from '../reducers/util';
import { i18n } from '@kbn/i18n';

const SOURCE_UPDATE_REQUIRED = true;
const NO_SOURCE_UPDATE_REQUIRED = false;

export class AbstractLayer {
  constructor({ layerDescriptor, source, style }) {
    this._descriptor = AbstractLayer.createDescriptor(layerDescriptor);
    this._source = source;
    this._style = style;
    if (this._descriptor.__dataRequests) {
      this._dataRequests = this._descriptor.__dataRequests.map(
        dataRequest => new DataRequest(dataRequest)
      );
    } else {
      this._dataRequests = [];
    }
  }

  static getBoundDataForSource(mbMap, sourceId) {
    const mbStyle = mbMap.getStyle();
    return mbStyle.sources[sourceId].data;
  }

  static createDescriptor(options = {}) {
    const layerDescriptor = { ...options };

    layerDescriptor.__dataRequests = _.get(options, '__dataRequests', []);
    layerDescriptor.id = _.get(options, 'id', uuid());
    layerDescriptor.label = options.label && options.label.length > 0 ? options.label : null;
    layerDescriptor.minZoom = _.get(options, 'minZoom', 0);
    layerDescriptor.maxZoom = _.get(options, 'maxZoom', 24);
    layerDescriptor.alpha = _.get(options, 'alpha', 0.75);
    layerDescriptor.visible = _.get(options, 'visible', true);
    layerDescriptor.applyGlobalQuery = _.get(options, 'applyGlobalQuery', true);
    layerDescriptor.style = _.get(options, 'style', {});

    return layerDescriptor;
  }

  destroy() {
    if (this._source) {
      this._source.destroy();
    }
  }

  async cloneDescriptor() {
    const clonedDescriptor = copyPersistentState(this._descriptor);
    // layer id is uuid used to track styles/layers in mapbox
    clonedDescriptor.id = uuid();
    const displayName = await this.getDisplayName();
    clonedDescriptor.label = `Clone of ${displayName}`;
    clonedDescriptor.sourceDescriptor = this._source.cloneDescriptor();
    if (clonedDescriptor.joins) {
      clonedDescriptor.joins.forEach(joinDescriptor => {
        // right.id is uuid used to track requests in inspector
        joinDescriptor.right.id = uuid();
      });
    }
    return clonedDescriptor;
  }

  makeMbLayerId(layerNameSuffix) {
    return `${this.getId()}${MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER}${layerNameSuffix}`;
  }

  isJoinable() {
    return this._source.isJoinable();
  }

  supportsElasticsearchFilters() {
    return this._source.supportsElasticsearchFilters();
  }

  async supportsFitToBounds() {
    return await this._source.supportsFitToBounds();
  }

  async getDisplayName() {
    if (this._descriptor.label) {
      return this._descriptor.label;
    }

    return (await this._source.getDisplayName()) || `Layer ${this._descriptor.id}`;
  }

  async getAttributions() {
    if (!this.hasErrors()) {
      return await this._source.getAttributions();
    }
    return [];
  }

  getLabel() {
    return this._descriptor.label ? this._descriptor.label : '';
  }

  getCustomIconAndTooltipContent() {
    return {
      icon: <EuiIcon size="m" type={this.getLayerTypeIconName()} />,
    };
  }

  getIconAndTooltipContent(zoomLevel, isUsingSearch) {
    let icon;
    let tooltipContent = null;
    const footnotes = [];
    if (this.hasErrors()) {
      icon = (
        <EuiIcon
          aria-label={i18n.translate('xpack.maps.layer.loadWarningAriaLabel', {
            defaultMessage: 'Load warning',
          })}
          size="m"
          type="alert"
          color="warning"
        />
      );
      tooltipContent = this.getErrors();
    } else if (this.isLayerLoading()) {
      icon = <EuiLoadingSpinner size="m" />;
    } else if (!this.isVisible()) {
      icon = <EuiIcon size="m" type="eyeClosed" />;
      tooltipContent = i18n.translate('xpack.maps.layer.layerHiddenTooltip', {
        defaultMessage: `Layer is hidden.`,
      });
    } else if (!this.showAtZoomLevel(zoomLevel)) {
      const { minZoom, maxZoom } = this.getZoomConfig();
      icon = <EuiIcon size="m" type="expand" />;
      tooltipContent = i18n.translate('xpack.maps.layer.zoomFeedbackTooltip', {
        defaultMessage: `Layer is visible between zoom levels {minZoom} and {maxZoom}.`,
        values: { minZoom, maxZoom },
      });
    } else {
      const customIconAndTooltipContent = this.getCustomIconAndTooltipContent();
      if (customIconAndTooltipContent) {
        icon = customIconAndTooltipContent.icon;
        if (!customIconAndTooltipContent.areResultsTrimmed) {
          tooltipContent = customIconAndTooltipContent.tooltipContent;
        } else {
          footnotes.push({
            icon: <EuiIcon color="subdued" type="partial" size="s" />,
            message: customIconAndTooltipContent.tooltipContent,
          });
        }
      }

      if (isUsingSearch && this.getQueryableIndexPatternIds().length) {
        footnotes.push({
          icon: <EuiIcon color="subdued" type="filter" size="s" />,
          message: i18n.translate('xpack.maps.layer.isUsingSearchMsg', {
            defaultMessage: 'Results narrowed by search bar',
          }),
        });
      }
    }

    return {
      icon,
      tooltipContent,
      footnotes,
    };
  }

  hasLegendDetails() {
    return false;
  }

  getLegendDetails() {
    return null;
  }

  getId() {
    return this._descriptor.id;
  }

  getSource() {
    return this._source;
  }

  isVisible() {
    return this._descriptor.visible;
  }

  showAtZoomLevel(zoom) {
    return zoom >= this._descriptor.minZoom && zoom <= this._descriptor.maxZoom;
  }

  getMinZoom() {
    return this._descriptor.minZoom;
  }

  getMaxZoom() {
    return this._descriptor.maxZoom;
  }

  getAlpha() {
    return this._descriptor.alpha;
  }

  getQuery() {
    return this._descriptor.query;
  }

  getApplyGlobalQuery() {
    return this._descriptor.applyGlobalQuery;
  }

  getZoomConfig() {
    return {
      minZoom: this._descriptor.minZoom,
      maxZoom: this._descriptor.maxZoom,
    };
  }

  getCurrentStyle() {
    return this._style;
  }

  async getImmutableSourceProperties() {
    return this._source.getImmutableProperties();
  }

  renderSourceSettingsEditor = ({ onChange }) => {
    return this._source.renderSourceSettingsEditor({ onChange });
  };

  getPrevRequestToken(dataId) {
    const prevDataRequest = this.getDataRequest(dataId);
    if (!prevDataRequest) {
      return;
    }

    return prevDataRequest.getRequestToken();
  }

  getInFlightRequestTokens() {
    if (!this._dataRequests) {
      return [];
    }

    const requestTokens = this._dataRequests.map(dataRequest => dataRequest.getRequestToken());
    return _.compact(requestTokens);
  }

  getSourceDataRequest() {
    return this.getDataRequest(SOURCE_DATA_ID_ORIGIN);
  }

  getDataRequest(id) {
    return this._dataRequests.find(dataRequest => dataRequest.getDataId() === id);
  }

  isLayerLoading() {
    return this._dataRequests.some(dataRequest => dataRequest.isLoading());
  }

  hasErrors() {
    return _.get(this._descriptor, '__isInErrorState', false);
  }

  getErrors() {
    return this.hasErrors() ? this._descriptor.__errorMessage : '';
  }

  toLayerDescriptor() {
    return this._descriptor;
  }

  async syncData() {
    //no-op by default
  }

  getMbLayerIds() {
    throw new Error('Should implement AbstractLayer#getMbLayerIds');
  }

  ownsMbLayerId() {
    throw new Error('Should implement AbstractLayer#ownsMbLayerId');
  }

  ownsMbSourceId() {
    throw new Error('Should implement AbstractLayer#ownsMbSourceId');
  }

  canShowTooltip() {
    return false;
  }

  syncLayerWithMB() {
    throw new Error('Should implement AbstractLayer#syncLayerWithMB');
  }

  updateDueToExtent(source, prevMeta = {}, nextMeta = {}) {
    const extentAware = source.isFilterByMapBounds();
    if (!extentAware) {
      return NO_SOURCE_UPDATE_REQUIRED;
    }

    const { buffer: previousBuffer } = prevMeta;
    const { buffer: newBuffer } = nextMeta;

    if (!previousBuffer) {
      return SOURCE_UPDATE_REQUIRED;
    }

    if (_.isEqual(previousBuffer, newBuffer)) {
      return NO_SOURCE_UPDATE_REQUIRED;
    }

    const previousBufferGeometry = turf.bboxPolygon([
      previousBuffer.minLon,
      previousBuffer.minLat,
      previousBuffer.maxLon,
      previousBuffer.maxLat,
    ]);
    const newBufferGeometry = turf.bboxPolygon([
      newBuffer.minLon,
      newBuffer.minLat,
      newBuffer.maxLon,
      newBuffer.maxLat,
    ]);
    const doesPreviousBufferContainNewBuffer = turfBooleanContains(
      previousBufferGeometry,
      newBufferGeometry
    );

    const isTrimmed = _.get(prevMeta, 'areResultsTrimmed', false);
    return doesPreviousBufferContainNewBuffer && !isTrimmed
      ? NO_SOURCE_UPDATE_REQUIRED
      : SOURCE_UPDATE_REQUIRED;
  }

  getLayerTypeIconName() {
    throw new Error('should implement Layer#getLayerTypeIconName');
  }

  isDataLoaded() {
    const sourceDataRequest = this.getSourceDataRequest();
    return sourceDataRequest && sourceDataRequest.hasData();
  }

  async getBounds() {
    return {
      min_lon: -180,
      max_lon: 180,
      min_lat: -89,
      max_lat: 89,
    };
  }

  renderStyleEditor({ onStyleDescriptorChange }) {
    if (!this._style) {
      return null;
    }
    return this._style.renderEditor({ layer: this, onStyleDescriptorChange });
  }

  getIndexPatternIds() {
    return [];
  }

  getQueryableIndexPatternIds() {
    if (this.getApplyGlobalQuery()) {
      return this.getIndexPatternIds();
    }

    return [];
  }

  async getOrdinalFields() {
    return [];
  }

  syncVisibilityWithMb(mbMap, mbLayerId) {
    mbMap.setLayoutProperty(mbLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
  }
}
