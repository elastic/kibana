/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import turf from 'turf';
import React from 'react';
import { AbstractLayer } from './layer';
import { VectorStyle } from './styles/vector_style';
import { LeftInnerJoin } from './joins/left_inner_join';
import {
  GEO_JSON_TYPE,
  FEATURE_ID_PROPERTY_NAME,
  SOURCE_DATA_ID_ORIGIN,
  FEATURE_VISIBLE_PROPERTY_NAME
} from '../../../common/constants';
import _ from 'lodash';
import { JoinTooltipProperty } from './tooltips/join_tooltip_property';
import { isRefreshOnlyQuery } from './util/is_refresh_only_query';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const EMPTY_FEATURE_COLLECTION = {
  type: 'FeatureCollection',
  features: []
};

const VISIBILITY_FILTER_CLAUSE = ['all',
  [
    '==',
    ['get', FEATURE_VISIBLE_PROPERTY_NAME],
    true
  ]
];

const FILL_LAYER_MB_FILTER = [
  ...VISIBILITY_FILTER_CLAUSE,
  [
    'any',
    ['==', ['geometry-type'], GEO_JSON_TYPE.POLYGON],
    ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POLYGON]
  ]
];

const LINE_LAYER_MB_FILTER = [...VISIBILITY_FILTER_CLAUSE,
  [
    'any',
    ['==', ['geometry-type'], GEO_JSON_TYPE.POLYGON],
    ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POLYGON],
    ['==', ['geometry-type'], GEO_JSON_TYPE.LINE_STRING],
    ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_LINE_STRING]
  ]
];

const POINT_LAYER_MB_FILTER = [...VISIBILITY_FILTER_CLAUSE,
  [
    'any',
    ['==', ['geometry-type'], GEO_JSON_TYPE.POINT],
    ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POINT]
  ]
];


let idCounter = 0;

function generateNumericalId() {
  const newId = idCounter < Number.MAX_SAFE_INTEGER ? idCounter : 0;
  idCounter = newId + 1;
  return newId;
}


export class VectorLayer extends AbstractLayer {

  static type = 'VECTOR';

  static createDescriptor(options, mapColors) {
    const layerDescriptor = super.createDescriptor(options);
    layerDescriptor.type = VectorLayer.type;

    if (!options.style) {
      const styleProperties = VectorStyle.createDefaultStyleProperties(mapColors);
      layerDescriptor.style = VectorStyle.createDescriptor(styleProperties);
    }

    return layerDescriptor;
  }

  constructor(options) {
    super(options);
    this._joins = [];
    if (options.layerDescriptor.joins) {
      options.layerDescriptor.joins.forEach((joinDescriptor) => {
        this._joins.push(new LeftInnerJoin(joinDescriptor, this._source.getInspectorAdapters()));
      });
    }
  }

  destroy() {
    if (this._source) {
      this._source.destroy();
    }
    this._joins.forEach(joinSource => {
      joinSource.destroy();
    });
  }

  getJoins() {
    return this._joins.slice();
  }

  getValidJoins() {
    return this._joins.filter(join => {
      return join.hasCompleteConfig();
    });
  }

  isDataLoaded() {
    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest || !sourceDataRequest.hasData()) {
      return false;
    }

    const joins = this.getValidJoins();
    for (let i = 0; i < joins.length; i++) {
      const joinDataRequest = this.getDataRequest(joins[i].getSourceId());
      if (!joinDataRequest || !joinDataRequest.hasData()) {
        return false;
      }
    }

    return true;
  }

  getCustomIconAndTooltipContent() {
    const sourceDataRequest = this.getSourceDataRequest();
    const featureCollection = sourceDataRequest ? sourceDataRequest.getData() : null;


    const noResultsIcon = (
      <EuiIcon
        size="m"
        color="subdued"
        type="minusInCircle"
      />
    );
    if (!featureCollection || featureCollection.features.length === 0) {
      return {
        icon: noResultsIcon,
        tooltipContent: i18n.translate('xpack.maps.vectorLayer.noResultsFoundTooltip', {
          defaultMessage: `No results found.`
        })
      };
    }

    if (this._joins.length &&
      !featureCollection.features.some((feature) => feature.properties[FEATURE_VISIBLE_PROPERTY_NAME])
    ) {
      return {
        icon: noResultsIcon,
        tooltipContent: i18n.translate('xpack.maps.vectorLayer.noResultsFoundInJoinTooltip', {
          defaultMessage: `No matching results found in term joins`
        })
      };
    }
    return {
      icon: this._style.getIcon(),
      tooltipContent: this._source.getSourceTooltipContent(sourceDataRequest)
    };

  }

  getLayerTypeIconName() {
    return 'vector';
  }

  hasLegendDetails() {
    return this._style.getDynamicPropertiesArray().length > 0;
  }

  getLegendDetails() {
    const getFieldLabel = async fieldName => {
      const oridinalFields = await this.getOrdinalFields();
      const field = oridinalFields.find(({ name }) => {
        return name === fieldName;
      });

      return field ? field.label : fieldName;
    };

    return this._style.getLegendDetails(getFieldLabel);
  }

  _getBoundsBasedOnData() {
    const featureCollection = this._getSourceFeatureCollection();
    if (!featureCollection) {
      return null;
    }
    const bbox = turf.bbox(featureCollection);
    return {
      min_lon: bbox[0],
      min_lat: bbox[1],
      max_lon: bbox[2],
      max_lat: bbox[3]
    };
  }

  async getBounds(dataFilters) {
    if (this._source.isBoundsAware()) {
      const searchFilters = this._getSearchFilters(dataFilters);
      return await this._source.getBoundsForFilters(searchFilters);
    }
    return this._getBoundsBasedOnData();
  }

  async getLeftJoinFields() {
    return await this._source.getLeftJoinFields();
  }

  async getSourceName() {
    return this._source.getDisplayName();
  }

  async getOrdinalFields() {
    const numberFields = await this._source.getNumberFields();
    const numberFieldOptions = numberFields.map(({ label, name }) => {
      return {
        label,
        name,
        origin: SOURCE_DATA_ID_ORIGIN
      };
    });
    const joinFields = [];
    this.getValidJoins().forEach(join => {
      const fields = join.getJoinFields().map(joinField => {
        return {
          ...joinField,
          origin: 'join',
        };
      });
      joinFields.push(...fields);
    });

    return [...numberFieldOptions, ...joinFields];
  }

  getIndexPatternIds() {
    const indexPatternIds = this._source.getIndexPatternIds();
    this.getValidJoins().forEach(join => {
      indexPatternIds.push(...join.getIndexPatternIds());
    });
    return indexPatternIds;
  }

  _findDataRequestForSource(sourceDataId) {
    return this._dataRequests.find(dataRequest => dataRequest.getDataId() === sourceDataId);
  }

  async _canSkipSourceUpdate(source, sourceDataId, nextMeta) {

    const timeAware = await source.isTimeAware();
    const refreshTimerAware = await source.isRefreshTimerAware();
    const extentAware = source.isFilterByMapBounds();
    const isFieldAware = source.isFieldAware();
    const isQueryAware = source.isQueryAware();
    const isGeoGridPrecisionAware = source.isGeoGridPrecisionAware();

    if (
      !timeAware &&
      !refreshTimerAware &&
      !extentAware &&
      !isFieldAware &&
      !isQueryAware &&
      !isGeoGridPrecisionAware
    ) {
      const sourceDataRequest = this._findDataRequestForSource(sourceDataId);
      return (sourceDataRequest && sourceDataRequest.hasDataOrRequestInProgress());
    }

    const sourceDataRequest = this._findDataRequestForSource(sourceDataId);
    if (!sourceDataRequest) {
      return false;
    }
    const prevMeta = sourceDataRequest.getMeta();
    if (!prevMeta) {
      return false;
    }

    let updateDueToTime = false;
    if (timeAware) {
      updateDueToTime = !_.isEqual(prevMeta.timeFilters, nextMeta.timeFilters);
    }

    let updateDueToRefreshTimer = false;
    if (refreshTimerAware && nextMeta.refreshTimerLastTriggeredAt) {
      updateDueToRefreshTimer = !_.isEqual(prevMeta.refreshTimerLastTriggeredAt, nextMeta.refreshTimerLastTriggeredAt);
    }

    let updateDueToFields = false;
    if (isFieldAware) {
      updateDueToFields = !_.isEqual(prevMeta.fieldNames, nextMeta.fieldNames);
    }

    let updateDueToQuery = false;
    let updateDueToFilters = false;
    let updateDueToSourceQuery = false;
    let updateDueToApplyGlobalQuery = false;
    if (isQueryAware) {
      updateDueToApplyGlobalQuery = prevMeta.applyGlobalQuery !== nextMeta.applyGlobalQuery;
      updateDueToSourceQuery = !_.isEqual(prevMeta.sourceQuery, nextMeta.sourceQuery);
      if (nextMeta.applyGlobalQuery) {
        updateDueToQuery = !_.isEqual(prevMeta.query, nextMeta.query);
        updateDueToFilters = !_.isEqual(prevMeta.filters, nextMeta.filters);
      } else {
        // Global filters and query are not applied to layer search request so no re-fetch required.
        // Exception is "Refresh" query.
        updateDueToQuery = isRefreshOnlyQuery(prevMeta.query, nextMeta.query);
      }
    }

    let updateDueToPrecisionChange = false;
    if (isGeoGridPrecisionAware) {
      updateDueToPrecisionChange = !_.isEqual(prevMeta.geogridPrecision, nextMeta.geogridPrecision);
    }

    const updateDueToExtentChange = this.updateDueToExtent(source, prevMeta, nextMeta);

    const updateDueToSourceMetaChange = !_.isEqual(prevMeta.sourceMeta, nextMeta.sourceMeta);

    return !updateDueToTime
      && !updateDueToRefreshTimer
      && !updateDueToExtentChange
      && !updateDueToFields
      && !updateDueToQuery
      && !updateDueToFilters
      && !updateDueToSourceQuery
      && !updateDueToApplyGlobalQuery
      && !updateDueToPrecisionChange
      && !updateDueToSourceMetaChange;
  }

  async _syncJoin({ join, startLoading, stopLoading, onLoadError, dataFilters }) {

    const joinSource = join.getRightJoinSource();
    const sourceDataId = join.getSourceId();
    const requestToken = Symbol(`layer-join-refresh:${ this.getId()} - ${sourceDataId}`);

    const searchFilters = {
      ...dataFilters,
      fieldNames: joinSource.getFieldNames(),
      sourceQuery: joinSource.getWhereQuery(),
      applyGlobalQuery: this.getApplyGlobalQuery(),
    };
    const canSkip = await this._canSkipSourceUpdate(joinSource, sourceDataId, searchFilters);
    if (canSkip) {
      const sourceDataRequest = this._findDataRequestForSource(sourceDataId);
      const propertiesMap = sourceDataRequest ? sourceDataRequest.getData() : null;
      return {
        dataHasChanged: false,
        join: join,
        propertiesMap: propertiesMap
      };
    }

    try {
      startLoading(sourceDataId, requestToken, searchFilters);
      const leftSourceName = await this.getSourceName();
      const {
        propertiesMap
      } = await joinSource.getPropertiesMap(searchFilters, leftSourceName, join.getLeftFieldName());
      stopLoading(sourceDataId, requestToken, propertiesMap);
      return {
        dataHasChanged: true,
        join: join,
        propertiesMap: propertiesMap,
      };
    } catch (e) {
      onLoadError(sourceDataId, requestToken, `Join error: ${e.message}`);
      return {
        dataHasChanged: false,
        join: join,
        propertiesMap: null
      };
    }
  }

  async _syncJoins({ startLoading, stopLoading, onLoadError, dataFilters }) {
    const joinSyncs = this.getValidJoins().map(async join => {
      return this._syncJoin({ join, startLoading, stopLoading, onLoadError, dataFilters });
    });

    return await Promise.all(joinSyncs);
  }

  _getSearchFilters(dataFilters) {
    const fieldNames = [
      ...this._source.getFieldNames(),
      ...this._style.getSourceFieldNames(),
      ...this.getValidJoins().map(join => {
        return join.getLeftFieldName();
      })
    ];

    return {
      ...dataFilters,
      fieldNames: _.uniq(fieldNames).sort(),
      geogridPrecision: this._source.getGeoGridPrecision(dataFilters.zoom),
      sourceQuery: this.getQuery(),
      applyGlobalQuery: this.getApplyGlobalQuery(),
      sourceMeta: this._source.getSyncMeta(),
    };
  }

  async _performInnerJoins(sourceResult, joinStates, updateSourceData) {

    //should update the store if
    //-- source result was refreshed
    //-- any of the join configurations changed (joinState changed)
    //-- visibility of any of the features has changed

    let shouldUpdateStore = sourceResult.refreshed || joinStates.some((joinState) => joinState.dataHasChanged);

    if (!shouldUpdateStore) {
      return;
    }

    for (let i = 0; i < sourceResult.featureCollection.features.length; i++) {
      const feature = sourceResult.featureCollection.features[i];
      const oldVisbility = feature.properties[FEATURE_VISIBLE_PROPERTY_NAME];
      let isFeatureVisible = true;
      for (let j = 0; j < joinStates.length; j++) {
        const joinState = joinStates[j];
        const leftInnerJoin = joinState.join;
        const rightMetricFields = leftInnerJoin.getRightMetricFields();
        const canJoinOnCurrent = leftInnerJoin.joinPropertiesToFeature(feature, joinState.propertiesMap, rightMetricFields);
        isFeatureVisible = isFeatureVisible && canJoinOnCurrent;
      }

      if (oldVisbility !== isFeatureVisible) {
        shouldUpdateStore = true;
      }

      feature.properties[FEATURE_VISIBLE_PROPERTY_NAME] = isFeatureVisible;
    }

    if (shouldUpdateStore) {
      updateSourceData({ ...sourceResult.featureCollection });
    }
  }

  async _syncSource({ startLoading, stopLoading, onLoadError, dataFilters }) {

    const requestToken = Symbol(`layer-source-refresh:${ this.getId()} - source`);

    const searchFilters = this._getSearchFilters(dataFilters);
    const canSkip = await this._canSkipSourceUpdate(this._source, SOURCE_DATA_ID_ORIGIN, searchFilters);
    if (canSkip) {
      const sourceDataRequest = this.getSourceDataRequest();
      return {
        refreshed: false,
        featureCollection: sourceDataRequest.getData()
      };
    }

    try {
      startLoading(SOURCE_DATA_ID_ORIGIN, requestToken, searchFilters);
      const layerName = await this.getDisplayName();
      const { data: featureCollection, meta } = await this._source.getGeoJsonWithMeta(layerName, searchFilters);
      this._assignIdsToFeatures(featureCollection);
      stopLoading(SOURCE_DATA_ID_ORIGIN, requestToken, featureCollection, meta);
      return {
        refreshed: true,
        featureCollection: featureCollection
      };
    } catch (error) {
      onLoadError(SOURCE_DATA_ID_ORIGIN, requestToken, error.message);
      return {
        refreshed: false
      };
    }
  }

  _assignIdsToFeatures(featureCollection) {
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];
      const id = generateNumericalId();
      feature.properties[FEATURE_ID_PROPERTY_NAME] = id;
      feature.id = id;
    }
  }

  async syncData({ startLoading, stopLoading, onLoadError, dataFilters, updateSourceData }) {
    if (!this.isVisible() || !this.showAtZoomLevel(dataFilters.zoom)) {
      return;
    }

    const sourceResult = await this._syncSource({ startLoading, stopLoading, onLoadError, dataFilters });
    if (!sourceResult.featureCollection || !sourceResult.featureCollection.features.length) {
      return;
    }

    const joinStates = await this._syncJoins({ startLoading, stopLoading, onLoadError, dataFilters });
    await this._performInnerJoins(sourceResult, joinStates, updateSourceData);

  }

  _getSourceFeatureCollection() {
    const sourceDataRequest = this.getSourceDataRequest();
    return sourceDataRequest ? sourceDataRequest.getData() : null;
  }

  _syncFeatureCollectionWithMb(mbMap) {

    const mbGeoJSONSource = mbMap.getSource(this.getId());
    const featureCollection = this._getSourceFeatureCollection();
    const featureCollectionOnMap = AbstractLayer.getBoundDataForSource(mbMap, this.getId());

    if (!featureCollection) {
      if (featureCollectionOnMap) {
        this._style.clearFeatureState(featureCollectionOnMap, mbMap, this.getId());
      }
      mbGeoJSONSource.setData(EMPTY_FEATURE_COLLECTION);
      return;
    }

    if (featureCollection !== featureCollectionOnMap) {
      mbGeoJSONSource.setData(featureCollection);
    }

    const hasGeoJsonProperties = this._style.setFeatureState(featureCollection, mbMap, this.getId());

    // "feature-state" data expressions are not supported with layout properties.
    // To work around this limitation,
    // scaled layout properties (like icon-size) must fall back to geojson property values :(
    if (hasGeoJsonProperties) {
      mbGeoJSONSource.setData(featureCollection);
    }
  }

  _setMbPointsProperties(mbMap) {
    const pointLayerId = this._getMbPointLayerId();
    const symbolLayerId = this._getMbSymbolLayerId();
    const pointLayer = mbMap.getLayer(pointLayerId);
    const symbolLayer = mbMap.getLayer(symbolLayerId);

    let layerId;
    if (this._style.arePointsSymbolizedAsCircles()) {
      layerId = pointLayerId;
      if (symbolLayer) {
        mbMap.setLayoutProperty(symbolLayerId, 'visibility', 'none');
      }
      this._setMbCircleProperties(mbMap);
    } else {
      layerId = symbolLayerId;
      if (pointLayer) {
        mbMap.setLayoutProperty(pointLayerId, 'visibility', 'none');
      }
      this._setMbSymbolProperties(mbMap);
    }

    mbMap.setLayoutProperty(layerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    mbMap.setLayerZoomRange(layerId, this._descriptor.minZoom, this._descriptor.maxZoom);
  }

  _setMbCircleProperties(mbMap) {
    const sourceId = this.getId();
    const pointLayerId = this._getMbPointLayerId();
    const pointLayer = mbMap.getLayer(pointLayerId);

    if (!pointLayer) {
      mbMap.addLayer({
        id: pointLayerId,
        type: 'circle',
        source: sourceId,
        paint: {}
      });
      mbMap.setFilter(pointLayerId, POINT_LAYER_MB_FILTER);
    }

    this._style.setMBPaintPropertiesForPoints({
      alpha: this.getAlpha(),
      mbMap,
      pointLayerId: pointLayerId,
    });
  }

  _setMbSymbolProperties(mbMap) {
    const sourceId = this.getId();
    const symbolLayerId = this._getMbSymbolLayerId();
    const symbolLayer = mbMap.getLayer(symbolLayerId);

    if (!symbolLayer) {
      mbMap.addLayer({
        id: symbolLayerId,
        type: 'symbol',
        source: sourceId,
      });
      mbMap.setFilter(symbolLayerId, POINT_LAYER_MB_FILTER);
    }

    this._style.setMBSymbolPropertiesForPoints({
      alpha: this.getAlpha(),
      mbMap,
      symbolLayerId: symbolLayerId,
    });
  }

  _setMbLinePolygonProperties(mbMap) {
    const sourceId = this.getId();
    const fillLayerId = this._getMbPolygonLayerId();
    const lineLayerId = this._getMbLineLayerId();
    if (!mbMap.getLayer(fillLayerId)) {
      mbMap.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {}
      });
      mbMap.setFilter(fillLayerId, FILL_LAYER_MB_FILTER);
    }
    if (!mbMap.getLayer(lineLayerId)) {
      mbMap.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {}
      });
      mbMap.setFilter(lineLayerId, LINE_LAYER_MB_FILTER);
    }
    this._style.setMBPaintProperties({
      alpha: this.getAlpha(),
      mbMap,
      fillLayerId,
      lineLayerId,
    });
    mbMap.setLayoutProperty(fillLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    mbMap.setLayoutProperty(lineLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    mbMap.setLayerZoomRange(lineLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
    mbMap.setLayerZoomRange(fillLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
  }

  _syncStylePropertiesWithMb(mbMap) {
    this._setMbPointsProperties(mbMap);
    this._setMbLinePolygonProperties(mbMap);
  }

  _syncSourceBindingWithMb(mbMap) {
    const mbSource = mbMap.getSource(this.getId());
    if (!mbSource) {
      mbMap.addSource(this.getId(), {
        type: 'geojson',
        data: EMPTY_FEATURE_COLLECTION
      });
    }
  }

  syncLayerWithMB(mbMap) {
    this._syncSourceBindingWithMb(mbMap);
    this._syncFeatureCollectionWithMb(mbMap);
    this._syncStylePropertiesWithMb(mbMap);
  }

  _getMbPointLayerId() {
    return this.getId() + '_circle';
  }

  _getMbSymbolLayerId() {
    return this.getId() + '_symbol';
  }

  _getMbLineLayerId() {
    return this.getId() + '_line';
  }

  _getMbPolygonLayerId() {
    return this.getId() + '_fill';
  }

  getMbLayerIds() {
    return [this._getMbPointLayerId(), this._getMbSymbolLayerId(), this._getMbLineLayerId(), this._getMbPolygonLayerId()];
  }

  _addJoinsToSourceTooltips(tooltipsFromSource) {
    for (let i = 0; i < tooltipsFromSource.length; i++) {
      const tooltipProperty = tooltipsFromSource[i];
      const matchingJoins = [];
      for (let j = 0; j < this._joins.length; j++) {
        if (this._joins[j].getLeftFieldName() === tooltipProperty.getPropertyKey()) {
          matchingJoins.push(this._joins[j]);
        }
      }
      if (matchingJoins.length) {
        tooltipsFromSource[i] = new JoinTooltipProperty(tooltipProperty, matchingJoins);
      }
    }
  }

  async getPropertiesForTooltip(properties) {

    let allTooltips = await this._source.filterAndFormatPropertiesToHtml(properties);
    this._addJoinsToSourceTooltips(allTooltips);

    for (let i = 0; i < this._joins.length; i++) {
      const propsFromJoin = await this._joins[i].filterAndFormatPropertiesForTooltip(properties);
      allTooltips = [...allTooltips, ...propsFromJoin];
    }
    return allTooltips;
  }

  canShowTooltip() {
    return this.isVisible() && (this._source.canFormatFeatureProperties() || this._joins.length);
  }

  getFeatureById(id) {
    const featureCollection = this._getSourceFeatureCollection();
    if (!featureCollection) {
      return;
    }

    return featureCollection.features.find((feature) => {
      return feature.properties[FEATURE_ID_PROPERTY_NAME] === id;
    });
  }

}
