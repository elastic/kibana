/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import type {
  FeatureIdentifier,
  FilterSpecification,
  Map as MbMap,
  LayerSpecification,
  VectorTileSource,
} from '@kbn/mapbox-gl';
import { Feature } from 'geojson';
import { i18n } from '@kbn/i18n';
import { buildPhrasesFilter } from '@kbn/es-query';
import { VectorStyle } from '../../../styles/vector/vector_style';
import type { DynamicSizeProperty } from '../../../styles/vector/properties/dynamic_size_property';
import type { StaticSizeProperty } from '../../../styles/vector/properties/static_size_property';
import { getField } from '../../../../../common/elasticsearch_util';
import { LAYER_TYPE, SOURCE_TYPES, VECTOR_STYLES } from '../../../../../common/constants';
import {
  NO_RESULTS_ICON_AND_TOOLTIPCONTENT,
  AbstractVectorLayer,
  VectorLayerArguments,
} from '../vector_layer';
import { IMvtVectorSource } from '../../../sources/vector_source';
import { DataRequestContext } from '../../../../actions';
import {
  DataRequestMeta,
  StyleMetaDescriptor,
  VectorLayerDescriptor,
} from '../../../../../common/descriptor_types';
import { ESSearchSource } from '../../../sources/es_search_source';
import { hasESSourceMethod, isESVectorTileSource } from '../../../sources/es_source';
import { InnerJoin } from '../../../joins/inner_join';
import { LayerIcon } from '../../layer';
import { MvtSourceData, syncMvtSourceData } from './mvt_source_data';
import { PropertiesMap } from '../../../../../common/elasticsearch_util';
import { pluckStyleMeta } from './pluck_style_meta';
import {
  ES_MVT_HITS_TOTAL_RELATION,
  ES_MVT_HITS_TOTAL_VALUE,
  ES_MVT_META_LAYER_NAME,
  getAggsMeta,
  getHitsMeta,
} from '../../../util/tile_meta_feature_utils';
import { syncBoundsData } from '../bounds_data';

const MAX_RESULT_WINDOW_DATA_REQUEST_ID = 'maxResultWindow';

export class MvtVectorLayer extends AbstractVectorLayer {
  static createDescriptor(
    descriptor: Partial<VectorLayerDescriptor>,
    mapColors?: string[]
  ): VectorLayerDescriptor {
    const layerDescriptor = super.createDescriptor(descriptor, mapColors);
    layerDescriptor.type = LAYER_TYPE.MVT_VECTOR;

    if (!layerDescriptor.style) {
      const styleProperties = VectorStyle.createDefaultStyleProperties(mapColors ? mapColors : []);
      layerDescriptor.style = VectorStyle.createDescriptor(styleProperties);
    }

    return layerDescriptor;
  }

  readonly _source: IMvtVectorSource;

  constructor(args: VectorLayerArguments) {
    super(args);
    this._source = args.source as IMvtVectorSource;
  }

  isLayerLoading(zoom: number) {
    if (!this.isVisible() || !this.showAtZoomLevel(zoom)) {
      return false;
    }

    const isSourceLoading = super.isLayerLoading(zoom);
    return isSourceLoading ? true : this._isLoadingJoins();
  }

  _isTiled(): boolean {
    // Uses tiled maplibre source 'vector'
    return true;
  }

  async getBounds(getDataRequestContext: (layerId: string) => DataRequestContext) {
    // Add filter to narrow bounds to features with matching join keys
    let joinKeyFilter;
    const source = this.getSource();
    if (hasESSourceMethod(source, 'getIndexPattern')) {
      const { join, joinPropertiesMap } = this._getJoinResults();
      if (join && joinPropertiesMap) {
        const indexPattern = await source.getIndexPattern();
        const joinField = getField(indexPattern, join.getLeftField().getName());
        joinKeyFilter = buildPhrasesFilter(
          joinField,
          Array.from(joinPropertiesMap.keys()),
          indexPattern
        );
      }
    }

    const syncContext = getDataRequestContext(this.getId());
    return syncBoundsData({
      layerId: this.getId(),
      syncContext: {
        ...syncContext,
        dataFilters: {
          ...syncContext.dataFilters,
          joinKeyFilter,
        },
      },
      source: this.getSource(),
      sourceQuery: this.getQuery(),
    });
  }

  getFeatureId(feature: Feature): string | number | undefined {
    if (!isESVectorTileSource(this.getSource())) {
      return feature.id;
    }

    return this.getSource().getType() === SOURCE_TYPES.ES_SEARCH
      ? feature.properties?._id
      : feature.properties?._key;
  }

  getLayerIcon(isTocIcon: boolean): LayerIcon {
    if (!isESVectorTileSource(this.getSource())) {
      // Only ES-sources can have a special meta-tile, not 3rd party vector tile sources
      return {
        icon: this.getCurrentStyle().getIcon(false),
        tooltipContent: null,
        areResultsTrimmed: false,
      };
    }

    //
    // TODO ES MVT specific - move to es_tiled_vector_layer implementation
    //
    if (this.getSource().getType() === SOURCE_TYPES.ES_GEO_GRID) {
      const { docCount } = getAggsMeta(this._getTileMetaFeatures());
      return docCount === 0
        ? NO_RESULTS_ICON_AND_TOOLTIPCONTENT
        : {
            icon: this.getCurrentStyle().getIcon(false),
            tooltipContent: null,
            areResultsTrimmed: false,
          };
    }

    const maxResultWindow = this._getMaxResultWindow();
    if (maxResultWindow === undefined) {
      return {
        icon: this.getCurrentStyle().getIcon(false),
        tooltipContent: null,
        areResultsTrimmed: false,
      };
    }

    const { totalFeaturesCount, tilesWithFeatures, tilesWithTrimmedResults } = getHitsMeta(
      this._getTileMetaFeatures(),
      maxResultWindow
    );

    if (totalFeaturesCount === 0) {
      return NO_RESULTS_ICON_AND_TOOLTIPCONTENT;
    }

    const areResultsTrimmed = tilesWithTrimmedResults > 0;

    // Documents may be counted multiple times if geometry crosses tile boundaries.
    const canMultiCountShapes =
      !this.getStyle().getIsPointsOnly() && totalFeaturesCount > 1 && tilesWithFeatures > 1;
    const countPrefix = canMultiCountShapes ? '~' : '';
    const countMsg = areResultsTrimmed
      ? i18n.translate('xpack.maps.tiles.resultsTrimmedMsg', {
          defaultMessage: `Results limited to {countPrefix}{count} documents.`,
          values: {
            count: totalFeaturesCount.toLocaleString(),
            countPrefix,
          },
        })
      : i18n.translate('xpack.maps.tiles.resultsCompleteMsg', {
          defaultMessage: `Found {countPrefix}{count} documents.`,
          values: {
            count: totalFeaturesCount.toLocaleString(),
            countPrefix,
          },
        });
    const tooltipContent = canMultiCountShapes
      ? countMsg +
        i18n.translate('xpack.maps.tiles.shapeCountMsg', {
          defaultMessage: ' This count is approximate.',
        })
      : countMsg;

    return {
      icon: this.getCurrentStyle().getIcon(isTocIcon && areResultsTrimmed),
      tooltipContent,
      areResultsTrimmed,
    };
  }

  _getMaxResultWindow(): number | undefined {
    const dataRequest = this.getDataRequest(MAX_RESULT_WINDOW_DATA_REQUEST_ID);
    if (!dataRequest) {
      return;
    }
    const data = dataRequest.getData() as { maxResultWindow: number } | undefined;
    return data ? data.maxResultWindow : undefined;
  }

  async _syncMaxResultWindow({ startLoading, stopLoading }: DataRequestContext) {
    const prevDataRequest = this.getDataRequest(MAX_RESULT_WINDOW_DATA_REQUEST_ID);
    if (prevDataRequest) {
      return;
    }

    const requestToken = Symbol(`${this.getId()}-${MAX_RESULT_WINDOW_DATA_REQUEST_ID}`);
    startLoading(MAX_RESULT_WINDOW_DATA_REQUEST_ID, requestToken);
    const maxResultWindow = await (this.getSource() as ESSearchSource).getMaxResultWindow();
    stopLoading(MAX_RESULT_WINDOW_DATA_REQUEST_ID, requestToken, { maxResultWindow });
  }

  async syncData(syncContext: DataRequestContext) {
    try {
      if (this.getSource().getType() === SOURCE_TYPES.ES_SEARCH) {
        await this._syncMaxResultWindow(syncContext);
      }
      await this._syncSourceStyleMeta(syncContext, this.getSource(), this.getCurrentStyle());
      await this._syncSourceFormatters(syncContext, this.getSource(), this.getCurrentStyle());
      await this._syncSupportsFeatureEditing({ syncContext, source: this.getSource() });

      let maxLineWidth = 0;
      const lineWidth = this.getCurrentStyle()
        .getAllStyleProperties()
        .find((styleProperty) => {
          return styleProperty.getStyleName() === VECTOR_STYLES.LINE_WIDTH;
        });
      if (lineWidth) {
        if (!lineWidth.isDynamic() && lineWidth.isComplete()) {
          maxLineWidth = (lineWidth as StaticSizeProperty).getOptions().size;
        } else if (lineWidth.isDynamic() && lineWidth.isComplete()) {
          maxLineWidth = (lineWidth as DynamicSizeProperty).getOptions().maxSize;
        }
      }
      const buffer = Math.ceil(3.5 * maxLineWidth);

      await syncMvtSourceData({
        buffer,
        hasLabels: this.getCurrentStyle().hasLabels(),
        layerId: this.getId(),
        layerName: await this.getDisplayName(),
        prevDataRequest: this.getSourceDataRequest(),
        requestMeta: await this._getVectorSourceRequestMeta(
          syncContext.isForceRefresh,
          syncContext.dataFilters,
          this.getSource(),
          this.getCurrentStyle(),
          syncContext.isFeatureEditorOpenForLayer
        ),
        source: this.getSource() as IMvtVectorSource,
        syncContext,
      });

      if (this.hasJoins()) {
        await this._syncJoins(syncContext, this.getCurrentStyle());
      }
    } catch (error) {
      // Error used to stop execution flow. Error state stored in data request and displayed to user in layer legend.
    }
  }

  _syncSourceBindingWithMb(mbMap: MbMap) {
    const mbSource = mbMap.getSource(this.getMbSourceId());
    if (mbSource) {
      return;
    }
    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      // this is possible if the layer was invisible at startup.
      // the actions will not perform any data=syncing as an optimization when a layer is invisible
      // when turning the layer back into visible, it's possible the url had not been resolved yet.
      return;
    }

    const sourceData = sourceDataRequest.getData() as MvtSourceData | undefined;
    if (!sourceData) {
      return;
    }

    const mbSourceId = this.getMbSourceId();
    mbMap.addSource(mbSourceId, {
      type: 'vector',
      tiles: [sourceData.tileUrl],
      minzoom: sourceData.tileMinZoom,
      maxzoom: sourceData.tileMaxZoom,
      promoteId: this._getSourcePromoteId(),
    });
  }

  getMbLayerIds() {
    return [...super.getMbLayerIds(), this._getMbTooManyFeaturesLayerId()];
  }

  ownsMbSourceId(mbSourceId: string): boolean {
    return this.getMbSourceId() === mbSourceId;
  }

  _getJoinResults(): {
    join?: InnerJoin;
    joinPropertiesMap?: PropertiesMap;
    joinRequestMeta?: DataRequestMeta;
  } {
    const joins = this.getValidJoins();
    if (!joins || !joins.length) {
      return {};
    }

    const join = joins[0];
    const joinDataRequest = this.getDataRequest(join.getSourceDataRequestId());
    return {
      join,
      joinPropertiesMap: joinDataRequest?.getData() as PropertiesMap | undefined,
      joinRequestMeta: joinDataRequest?.getMeta(),
    };
  }

  _getMbTooManyFeaturesLayerId() {
    return this.makeMbLayerId('toomanyfeatures');
  }

  _getJoinFilterExpression(): FilterSpecification | undefined {
    const { join, joinPropertiesMap } = this._getJoinResults();
    if (!join) {
      return undefined;
    }

    // When there are no join results, return a filter that hides all features
    // work around for 'match' with empty array not filtering out features
    // This filter always returns false because features will never have `__kbn_never_prop__` property
    const hideAllFilter = ['has', '__kbn_never_prop__'] as FilterSpecification;

    if (!joinPropertiesMap) {
      return hideAllFilter;
    }

    const joinKeys = Array.from(joinPropertiesMap.keys());
    return joinKeys.length
      ? // Unable to check FEATURE_VISIBLE_PROPERTY_NAME flag since filter expressions do not support feature-state
        // Instead, remove unjoined source features by filtering out features without matching join keys
        ([
          'match',
          ['get', join.getLeftField().getName()],
          joinKeys,
          true, // match value
          false, // fallback - value with no match
        ] as FilterSpecification)
      : hideAllFilter;
  }

  _syncFeatureState(mbMap: MbMap) {
    const { joinPropertiesMap, joinRequestMeta } = this._getJoinResults();
    if (!joinPropertiesMap) {
      return;
    }

    const [firstKey] = joinPropertiesMap.keys();
    const firstKeyFeatureState = mbMap.getFeatureState({
      source: this.getMbSourceId(),
      sourceLayer: this._source.getTileSourceLayer(),
      id: firstKey,
    });
    const joinRequestStopTime = joinRequestMeta?.requestStopTime;
    if (firstKeyFeatureState?.requestStopTime === joinRequestStopTime) {
      // Do not update feature state when it already contains current join results
      return;
    }

    // Clear existing feature state
    mbMap.removeFeatureState({
      source: this.getMbSourceId(),
      sourceLayer: this._source.getTileSourceLayer(),
      // by omitting 'id' argument, all feature state is cleared for source
    });

    // Set feature state for join results
    // reusing featureIdentifier to avoid creating new object in tight loops
    const featureIdentifier: FeatureIdentifier = {
      source: this.getMbSourceId(),
      sourceLayer: this._source.getTileSourceLayer(),
      id: undefined,
    };
    joinPropertiesMap.forEach((value: object, key: string) => {
      featureIdentifier.id = key;
      mbMap.setFeatureState(featureIdentifier, {
        ...value,
        requestStopTime: joinRequestStopTime,
      });
    });
  }

  _syncStylePropertiesWithMb(mbMap: MbMap) {
    // @ts-ignore
    const mbSource = mbMap.getSource(this.getMbSourceId());
    if (!mbSource) {
      return;
    }

    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      return;
    }
    const sourceData = sourceDataRequest.getData() as MvtSourceData | undefined;
    if (!sourceData || sourceData.tileSourceLayer === '') {
      return;
    }

    this._setMbLabelProperties(mbMap, sourceData.tileSourceLayer);
    this._setMbPointsProperties(mbMap, sourceData.tileSourceLayer);
    this._setMbLinePolygonProperties(mbMap, sourceData.tileSourceLayer);
    this._syncTooManyFeaturesProperties(mbMap);
    (this.getSource() as IMvtVectorSource).syncSourceStyle?.(mbMap, () =>
      mbMap
        .getStyle()
        .layers.filter((mbLayer) => this.ownsMbLayerId(mbLayer.id))
        .map((layer) => layer.id)
    );
  }

  // TODO ES MVT specific - move to es_tiled_vector_layer implementation
  _syncTooManyFeaturesProperties(mbMap: MbMap) {
    if (this.getSource().getType() !== SOURCE_TYPES.ES_SEARCH) {
      return;
    }

    const maxResultWindow = this._getMaxResultWindow();
    if (maxResultWindow === undefined) {
      return;
    }

    const tooManyFeaturesLayerId = this._getMbTooManyFeaturesLayerId();

    if (!mbMap.getLayer(tooManyFeaturesLayerId)) {
      const mbTooManyFeaturesLayer: LayerSpecification = {
        id: tooManyFeaturesLayerId,
        type: 'line',
        source: this.getId(),
        paint: {},
      };
      mbTooManyFeaturesLayer['source-layer'] = ES_MVT_META_LAYER_NAME;
      mbMap.addLayer(mbTooManyFeaturesLayer);
      mbMap.setFilter(tooManyFeaturesLayerId, [
        'all',
        ['==', ['get', ES_MVT_HITS_TOTAL_RELATION], 'gte'],
        ['>=', ['get', ES_MVT_HITS_TOTAL_VALUE], maxResultWindow + 1],
      ]);
      mbMap.setPaintProperty(
        tooManyFeaturesLayerId,
        'line-color',
        this.getCurrentStyle().getPrimaryColor()
      );
      mbMap.setPaintProperty(tooManyFeaturesLayerId, 'line-width', 3);
      mbMap.setPaintProperty(tooManyFeaturesLayerId, 'line-dasharray', [2, 1]);
      mbMap.setPaintProperty(tooManyFeaturesLayerId, 'line-opacity', this.getAlpha());
    }

    this.syncVisibilityWithMb(mbMap, tooManyFeaturesLayerId);
    mbMap.setLayerZoomRange(tooManyFeaturesLayerId, this.getMinZoom(), this.getMaxZoom());
  }

  _getSourcePromoteId() {
    const { join } = this._getJoinResults();
    return join
      ? {
          [this._source.getTileSourceLayer()]: join.getLeftField().getName(),
        }
      : undefined;
  }

  // Maplibre does not expose API for updating source attributes.
  // Must remove/add vector source to update source attributes.
  // _requiresPrevSourceCleanup returns true when vector source needs to be removed so it can be re-added with updated attributes
  _requiresPrevSourceCleanup(mbMap: MbMap): boolean {
    const mbSource = mbMap.getSource(this.getMbSourceId());
    if (!mbSource) {
      return false;
    }
    if (!('tiles' in mbSource)) {
      // Expected source is not compatible, so remove.
      return true;
    }
    const mbTileSource = mbSource as VectorTileSource;

    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      return false;
    }
    const sourceData = sourceDataRequest.getData() as MvtSourceData | undefined;
    if (!sourceData) {
      return false;
    }

    const isSourceDifferent =
      mbTileSource.tiles?.[0] !== sourceData.tileUrl ||
      mbTileSource.minzoom !== sourceData.tileMinZoom ||
      mbTileSource.maxzoom !== sourceData.tileMaxZoom ||
      !_.isEqual(mbTileSource.promoteId, this._getSourcePromoteId());

    if (isSourceDifferent) {
      return true;
    }

    const layerIds = this.getMbLayerIds();
    for (let i = 0; i < layerIds.length; i++) {
      const mbLayer = mbMap.getLayer(layerIds[i]);
      // The mapbox type in the spec is specified with `source-layer`
      // but the programmable JS-object uses camelcase `sourceLayer`
      if (
        mbLayer &&
        mbLayer.sourceLayer !== sourceData.tileSourceLayer &&
        mbLayer.sourceLayer !== ES_MVT_META_LAYER_NAME
      ) {
        // If the source-pointer of one of the layers is stale, they will all be stale.
        // In this case, all the mb-layers need to be removed and re-added.
        return true;
      }
    }

    return false;
  }

  syncLayerWithMB(mbMap: MbMap) {
    this._removeStaleMbSourcesAndLayers(mbMap);
    this._syncSourceBindingWithMb(mbMap);
    this._syncFeatureState(mbMap);
    this._syncStylePropertiesWithMb(mbMap);
  }

  getMinZoom() {
    // higher resolution vector tiles cannot be displayed at lower-res
    return Math.max(this._source.getMinZoom(), super.getMinZoom());
  }

  getFeatureById(id: string | number): Feature | null {
    return null;
  }

  async getStyleMetaDescriptorFromLocalFeatures(): Promise<StyleMetaDescriptor | null> {
    const { joinPropertiesMap } = this._getJoinResults();
    return await pluckStyleMeta(
      this._getTileMetaFeatures(),
      joinPropertiesMap,
      await this.getSource().getSupportedShapeTypes(),
      this.getCurrentStyle().getDynamicPropertiesArray()
    );
  }
}
