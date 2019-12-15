/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import turf from 'turf';
import React from 'react';
import { AbstractLayer } from './layer';
import { VectorStyle } from './styles/vector/vector_style';
import { InnerJoin } from './joins/inner_join';
import {
  FEATURE_ID_PROPERTY_NAME,
  SOURCE_DATA_ID_ORIGIN,
  SOURCE_META_ID_ORIGIN,
  FEATURE_VISIBLE_PROPERTY_NAME,
  EMPTY_FEATURE_COLLECTION,
  LAYER_TYPE,
  FIELD_ORIGIN,
  LAYER_STYLE_TYPE,
} from '../../common/constants';
import _ from 'lodash';
import { JoinTooltipProperty } from './tooltips/join_tooltip_property';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataRequestAbortError } from './util/data_request';
import { canSkipSourceUpdate, canSkipStyleMetaUpdate } from './util/can_skip_fetch';
import { assignFeatureIds } from './util/assign_feature_ids';
import {
  getFillFilterExpression,
  getLineFilterExpression,
  getPointFilterExpression,
} from './util/mb_filter_expressions';

export class VectorLayer extends AbstractLayer {
  static type = LAYER_TYPE.VECTOR;

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
      options.layerDescriptor.joins.forEach(joinDescriptor => {
        const join = new InnerJoin(joinDescriptor, this._source);
        this._joins.push(join);
      });
    }
    this._style = new VectorStyle(this._descriptor.style, this._source, this);
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

  _hasJoins() {
    return this.getValidJoins().length > 0;
  }

  isDataLoaded() {
    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest || !sourceDataRequest.hasData()) {
      return false;
    }

    const joins = this.getValidJoins();
    for (let i = 0; i < joins.length; i++) {
      const joinDataRequest = this.getDataRequest(joins[i].getSourceDataRequestId());
      if (!joinDataRequest || !joinDataRequest.hasData()) {
        return false;
      }
    }

    return true;
  }

  getCustomIconAndTooltipContent() {
    const featureCollection = this._getSourceFeatureCollection();

    const noResultsIcon = <EuiIcon size="m" color="subdued" type="minusInCircle" />;
    if (!featureCollection || featureCollection.features.length === 0) {
      return {
        icon: noResultsIcon,
        tooltipContent: i18n.translate('xpack.maps.vectorLayer.noResultsFoundTooltip', {
          defaultMessage: `No results found.`,
        }),
      };
    }

    if (
      this._joins.length &&
      !featureCollection.features.some(feature => feature.properties[FEATURE_VISIBLE_PROPERTY_NAME])
    ) {
      return {
        icon: noResultsIcon,
        tooltipContent: i18n.translate('xpack.maps.vectorLayer.noResultsFoundInJoinTooltip', {
          defaultMessage: `No matching results found in term joins`,
        }),
      };
    }

    const sourceDataRequest = this.getSourceDataRequest();
    const { tooltipContent, areResultsTrimmed } = this._source.getSourceTooltipContent(
      sourceDataRequest
    );
    return {
      icon: this._style.getIcon(),
      tooltipContent: tooltipContent,
      areResultsTrimmed: areResultsTrimmed,
    };
  }

  getLayerTypeIconName() {
    return 'vector';
  }

  async hasLegendDetails() {
    return this._style.hasLegendDetails();
  }

  renderLegendDetails() {
    return this._style.renderLegendDetails();
  }

  _getBoundsBasedOnData() {
    const featureCollection = this._getSourceFeatureCollection();
    if (!featureCollection) {
      return null;
    }

    const visibleFeatures = featureCollection.features.filter(
      feature => feature.properties[FEATURE_VISIBLE_PROPERTY_NAME]
    );
    const bbox = turf.bbox({
      type: 'FeatureCollection',
      features: visibleFeatures,
    });
    return {
      min_lon: bbox[0],
      min_lat: bbox[1],
      max_lon: bbox[2],
      max_lat: bbox[3],
    };
  }

  async getBounds(dataFilters) {
    const isStaticLayer = !this._source.isBoundsAware() || !this._source.isFilterByMapBounds();
    if (isStaticLayer) {
      return this._getBoundsBasedOnData();
    }

    const searchFilters = this._getSearchFilters(dataFilters);
    return await this._source.getBoundsForFilters(searchFilters);
  }

  async getLeftJoinFields() {
    return await this._source.getLeftJoinFields();
  }

  async getSourceName() {
    return this._source.getDisplayName();
  }

  async getDateFields() {
    return await this._source.getDateFields();
  }

  async getNumberFields() {
    const numberFieldOptions = await this._source.getNumberFields();
    const joinFields = [];
    this.getValidJoins().forEach(join => {
      const fields = join.getJoinFields();
      joinFields.push(...fields);
    });
    return [...numberFieldOptions, ...joinFields];
  }

  async getOrdinalFields() {
    return [...(await this.getDateFields()), ...(await this.getNumberFields())];
  }

  getIndexPatternIds() {
    const indexPatternIds = this._source.getIndexPatternIds();
    this.getValidJoins().forEach(join => {
      indexPatternIds.push(...join.getIndexPatternIds());
    });
    return indexPatternIds;
  }

  getQueryableIndexPatternIds() {
    const indexPatternIds = this._source.getQueryableIndexPatternIds();
    this.getValidJoins().forEach(join => {
      indexPatternIds.push(...join.getQueryableIndexPatternIds());
    });
    return indexPatternIds;
  }

  _findDataRequestForSource(sourceDataId) {
    return this._dataRequests.find(dataRequest => dataRequest.getDataId() === sourceDataId);
  }

  async _syncJoin({
    join,
    startLoading,
    stopLoading,
    onLoadError,
    registerCancelCallback,
    dataFilters,
  }) {
    const joinSource = join.getRightJoinSource();
    const sourceDataId = join.getSourceDataRequestId();
    const requestToken = Symbol(`layer-join-refresh:${this.getId()} - ${sourceDataId}`);
    const searchFilters = {
      ...dataFilters,
      fieldNames: joinSource.getFieldNames(),
      sourceQuery: joinSource.getWhereQuery(),
      applyGlobalQuery: joinSource.getApplyGlobalQuery(),
    };
    const prevDataRequest = this._findDataRequestForSource(sourceDataId);

    const canSkipFetch = await canSkipSourceUpdate({
      source: joinSource,
      prevDataRequest,
      nextMeta: searchFilters,
    });
    if (canSkipFetch) {
      return {
        dataHasChanged: false,
        join: join,
        propertiesMap: prevDataRequest.getData(),
      };
    }

    try {
      startLoading(sourceDataId, requestToken, searchFilters);
      const leftSourceName = await this.getSourceName();
      const { propertiesMap } = await joinSource.getPropertiesMap(
        searchFilters,
        leftSourceName,
        join.getLeftField().getName(),
        registerCancelCallback.bind(null, requestToken)
      );
      stopLoading(sourceDataId, requestToken, propertiesMap);
      return {
        dataHasChanged: true,
        join: join,
        propertiesMap: propertiesMap,
      };
    } catch (e) {
      if (!(e instanceof DataRequestAbortError)) {
        onLoadError(sourceDataId, requestToken, `Join error: ${e.message}`);
      }
      return {
        dataHasChanged: true,
        join: join,
        propertiesMap: null,
      };
    }
  }

  async _syncJoins(syncContext) {
    const joinSyncs = this.getValidJoins().map(async join => {
      await this._syncJoinStyleMeta(syncContext, join);
      return this._syncJoin({ join, ...syncContext });
    });

    return await Promise.all(joinSyncs);
  }

  _getSearchFilters(dataFilters) {
    const fieldNames = [
      ...this._source.getFieldNames(),
      ...this._style.getSourceFieldNames(),
      ...this.getValidJoins().map(join => join.getLeftField().getName()),
    ];

    return {
      ...dataFilters,
      fieldNames: _.uniq(fieldNames).sort(),
      geogridPrecision: this._source.getGeoGridPrecision(dataFilters.zoom),
      sourceQuery: this.getQuery(),
      applyGlobalQuery: this._source.getApplyGlobalQuery(),
      sourceMeta: this._source.getSyncMeta(),
    };
  }

  async _performInnerJoins(sourceResult, joinStates, updateSourceData) {
    //should update the store if
    //-- source result was refreshed
    //-- any of the join configurations changed (joinState changed)
    //-- visibility of any of the features has changed

    let shouldUpdateStore =
      sourceResult.refreshed || joinStates.some(joinState => joinState.dataHasChanged);

    if (!shouldUpdateStore) {
      return;
    }

    for (let i = 0; i < sourceResult.featureCollection.features.length; i++) {
      const feature = sourceResult.featureCollection.features[i];
      const oldVisbility = feature.properties[FEATURE_VISIBLE_PROPERTY_NAME];
      let isFeatureVisible = true;
      for (let j = 0; j < joinStates.length; j++) {
        const joinState = joinStates[j];
        const innerJoin = joinState.join;
        const canJoinOnCurrent = innerJoin.joinPropertiesToFeature(
          feature,
          joinState.propertiesMap
        );
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

  async _syncSource({
    startLoading,
    stopLoading,
    onLoadError,
    registerCancelCallback,
    dataFilters,
  }) {
    const requestToken = Symbol(`layer-source-data:${this.getId()}`);
    const searchFilters = this._getSearchFilters(dataFilters);
    const prevDataRequest = this.getSourceDataRequest();

    const canSkipFetch = await canSkipSourceUpdate({
      source: this._source,
      prevDataRequest,
      nextMeta: searchFilters,
    });
    if (canSkipFetch) {
      return {
        refreshed: false,
        featureCollection: prevDataRequest.getData(),
      };
    }

    try {
      startLoading(SOURCE_DATA_ID_ORIGIN, requestToken, searchFilters);
      const layerName = await this.getDisplayName();
      const { data: sourceFeatureCollection, meta } = await this._source.getGeoJsonWithMeta(
        layerName,
        searchFilters,
        registerCancelCallback.bind(null, requestToken)
      );
      const layerFeatureCollection = assignFeatureIds(sourceFeatureCollection);
      stopLoading(SOURCE_DATA_ID_ORIGIN, requestToken, layerFeatureCollection, meta);
      return {
        refreshed: true,
        featureCollection: layerFeatureCollection,
      };
    } catch (error) {
      if (!(error instanceof DataRequestAbortError)) {
        onLoadError(SOURCE_DATA_ID_ORIGIN, requestToken, error.message);
      }
      return {
        refreshed: false,
      };
    }
  }

  async _syncSourceStyleMeta(syncContext) {
    if (this._style.constructor.type !== LAYER_STYLE_TYPE.VECTOR) {
      return;
    }

    return this._syncStyleMeta({
      source: this._source,
      sourceQuery: this.getQuery(),
      dataRequestId: SOURCE_META_ID_ORIGIN,
      dynamicStyleProps: this._style.getDynamicPropertiesArray().filter(dynamicStyleProp => {
        return (
          dynamicStyleProp.getFieldOrigin() === FIELD_ORIGIN.SOURCE &&
          dynamicStyleProp.isFieldMetaEnabled()
        );
      }),
      ...syncContext,
    });
  }

  async _syncJoinStyleMeta(syncContext, join) {
    const joinSource = join.getRightJoinSource();
    return this._syncStyleMeta({
      source: joinSource,
      sourceQuery: joinSource.getWhereQuery(),
      dataRequestId: join.getSourceMetaDataRequestId(),
      dynamicStyleProps: this._style.getDynamicPropertiesArray().filter(dynamicStyleProp => {
        const matchingField = joinSource.getMetricFieldForName(
          dynamicStyleProp.getField().getName()
        );
        return (
          dynamicStyleProp.getFieldOrigin() === FIELD_ORIGIN.JOIN &&
          !!matchingField &&
          dynamicStyleProp.isFieldMetaEnabled()
        );
      }),
      ...syncContext,
    });
  }

  async _syncStyleMeta({
    source,
    sourceQuery,
    dataRequestId,
    dynamicStyleProps,
    dataFilters,
    startLoading,
    stopLoading,
    onLoadError,
    registerCancelCallback,
  }) {
    if (!source.isESSource() || dynamicStyleProps.length === 0) {
      return;
    }

    const dynamicStyleFields = dynamicStyleProps.map(dynamicStyleProp => {
      return dynamicStyleProp.getField().getName();
    });

    const nextMeta = {
      dynamicStyleFields: _.uniq(dynamicStyleFields).sort(),
      sourceQuery,
      isTimeAware: this._style.isTimeAware() && (await source.isTimeAware()),
      timeFilters: dataFilters.timeFilters,
    };
    const prevDataRequest = this._findDataRequestForSource(dataRequestId);
    const canSkipFetch = canSkipStyleMetaUpdate({ prevDataRequest, nextMeta });
    if (canSkipFetch) {
      return;
    }

    const requestToken = Symbol(`layer-${this.getId()}-style-meta`);
    try {
      startLoading(dataRequestId, requestToken, nextMeta);
      const layerName = await this.getDisplayName();
      const styleMeta = await source.loadStylePropsMeta(
        layerName,
        this._style,
        dynamicStyleProps,
        registerCancelCallback,
        nextMeta
      );
      stopLoading(dataRequestId, requestToken, styleMeta, nextMeta);
    } catch (error) {
      if (!(error instanceof DataRequestAbortError)) {
        onLoadError(dataRequestId, requestToken, error.message);
      }
    }
  }

  async syncData(syncContext) {
    if (!this.isVisible() || !this.showAtZoomLevel(syncContext.dataFilters.zoom)) {
      return;
    }

    await this._syncSourceStyleMeta(syncContext);
    const sourceResult = await this._syncSource(syncContext);
    if (
      !sourceResult.featureCollection ||
      !sourceResult.featureCollection.features.length ||
      !this._hasJoins()
    ) {
      return;
    }

    const joinStates = await this._syncJoins(syncContext);
    await this._performInnerJoins(sourceResult, joinStates, syncContext.updateSourceData);
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

    // "feature-state" data expressions are not supported with layout properties.
    // To work around this limitation,
    // scaled layout properties (like icon-size) must fall back to geojson property values :(
    const hasGeoJsonProperties = this._style.setFeatureStateAndStyleProps(
      featureCollection,
      mbMap,
      this.getId()
    );
    if (featureCollection !== featureCollectionOnMap || hasGeoJsonProperties) {
      mbGeoJSONSource.setData(featureCollection);
    }
  }

  _setMbPointsProperties(mbMap) {
    const pointLayerId = this._getMbPointLayerId();
    const symbolLayerId = this._getMbSymbolLayerId();
    const pointLayer = mbMap.getLayer(pointLayerId);
    const symbolLayer = mbMap.getLayer(symbolLayerId);

    let mbLayerId;
    if (this._style.arePointsSymbolizedAsCircles()) {
      mbLayerId = pointLayerId;
      if (symbolLayer) {
        mbMap.setLayoutProperty(symbolLayerId, 'visibility', 'none');
      }
      this._setMbCircleProperties(mbMap);
    } else {
      mbLayerId = symbolLayerId;
      if (pointLayer) {
        mbMap.setLayoutProperty(pointLayerId, 'visibility', 'none');
      }
      this._setMbSymbolProperties(mbMap);
    }

    this.syncVisibilityWithMb(mbMap, mbLayerId);
    mbMap.setLayerZoomRange(mbLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
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
        paint: {},
      });
    }

    const filterExpr = getPointFilterExpression(this._hasJoins());
    if (filterExpr !== mbMap.getFilter(pointLayerId)) {
      mbMap.setFilter(pointLayerId, filterExpr);
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
    }

    const filterExpr = getPointFilterExpression(this._hasJoins());
    if (filterExpr !== mbMap.getFilter(symbolLayerId)) {
      mbMap.setFilter(symbolLayerId, filterExpr);
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
    const hasJoins = this._hasJoins();
    if (!mbMap.getLayer(fillLayerId)) {
      mbMap.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {},
      });
    }
    if (!mbMap.getLayer(lineLayerId)) {
      mbMap.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {},
      });
    }
    this._style.setMBPaintProperties({
      alpha: this.getAlpha(),
      mbMap,
      fillLayerId,
      lineLayerId,
    });

    this.syncVisibilityWithMb(mbMap, fillLayerId);
    mbMap.setLayerZoomRange(fillLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
    const fillFilterExpr = getFillFilterExpression(hasJoins);
    if (fillFilterExpr !== mbMap.getFilter(fillLayerId)) {
      mbMap.setFilter(fillLayerId, fillFilterExpr);
    }

    this.syncVisibilityWithMb(mbMap, lineLayerId);
    mbMap.setLayerZoomRange(lineLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
    const lineFilterExpr = getLineFilterExpression(hasJoins);
    if (lineFilterExpr !== mbMap.getFilter(lineLayerId)) {
      mbMap.setFilter(lineLayerId, lineFilterExpr);
    }
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
        data: EMPTY_FEATURE_COLLECTION,
      });
    }
  }

  syncLayerWithMB(mbMap) {
    this._syncSourceBindingWithMb(mbMap);
    this._syncFeatureCollectionWithMb(mbMap);
    this._syncStylePropertiesWithMb(mbMap);
  }

  _getMbPointLayerId() {
    return this.makeMbLayerId('circle');
  }

  _getMbSymbolLayerId() {
    return this.makeMbLayerId('symbol');
  }

  _getMbLineLayerId() {
    return this.makeMbLayerId('line');
  }

  _getMbPolygonLayerId() {
    return this.makeMbLayerId('fill');
  }

  getMbLayerIds() {
    return [
      this._getMbPointLayerId(),
      this._getMbSymbolLayerId(),
      this._getMbLineLayerId(),
      this._getMbPolygonLayerId(),
    ];
  }

  ownsMbLayerId(mbLayerId) {
    return (
      this._getMbPointLayerId() === mbLayerId ||
      this._getMbLineLayerId() === mbLayerId ||
      this._getMbPolygonLayerId() === mbLayerId ||
      this._getMbSymbolLayerId() === mbLayerId
    );
  }

  ownsMbSourceId(mbSourceId) {
    return this.getId() === mbSourceId;
  }

  _addJoinsToSourceTooltips(tooltipsFromSource) {
    for (let i = 0; i < tooltipsFromSource.length; i++) {
      const tooltipProperty = tooltipsFromSource[i];
      const matchingJoins = [];
      for (let j = 0; j < this._joins.length; j++) {
        if (this._joins[j].getLeftField().getName() === tooltipProperty.getPropertyKey()) {
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

    return featureCollection.features.find(feature => {
      return feature.properties[FEATURE_ID_PROPERTY_NAME] === id;
    });
  }
}
