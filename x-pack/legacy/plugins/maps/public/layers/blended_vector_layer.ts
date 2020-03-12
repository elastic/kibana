/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorLayer } from './vector_layer';
import { VectorStyle } from './styles/vector/vector_style';
import { getDefaultDynamicProperties, VECTOR_STYLES } from './styles/vector/vector_style_defaults';
import {
  IDynamicStyleProperty,
  DynamicStyleProperty,
} from './styles/vector/properties/dynamic_style_property';
import { StaticStyleProperty } from './styles/vector/properties/static_style_property';
import {
  COUNT_PROP_LABEL,
  COUNT_PROP_NAME,
  ES_GEO_GRID,
  LAYER_TYPE,
  AGG_TYPE,
  SOURCE_DATA_ID_ORIGIN,
  RENDER_AS,
} from '../../common/constants';
import { ESGeoGridSource } from './sources/es_geo_grid_source';
import { canSkipSourceUpdate } from './util/can_skip_fetch';
import { IVectorLayer } from './vector_layer';
import { IESSource } from '../sources/es_source';
import { IESAggSource } from '../sources/es_agg_source';

function getAggType(dynamicProperty: IDynamicStyleProperty): AGG_TYPE {
  return dynamicProperty.isOrdinal() ? AGG_TYPE.AVG : AGG_TYPE.TERMS;
}

export class BlendedVectorLayer extends VectorLayer implements IVectorLayer {
  static type = LAYER_TYPE.BLENDED_VECTOR;

  static createDescriptor(options, mapColors) {
    const layerDescriptor = VectorLayer.createDescriptor(options, mapColors);
    layerDescriptor.type = BlendedVectorLayer.type;
    return layerDescriptor;
  }

  private _activeSource;
  private _activeStyle;
  private readonly _clusterSource: IESAggSource;
  private readonly _clusterStyle;
  private readonly _documentSource: IESSource;
  private readonly _documentStyle;

  constructor(options) {
    super(options);

    this._initActiveSourceAndStyle();
  }

  destroy() {
    if (this._documentSource) {
      this._documentSource.destroy();
    }
    if (this._clusterSource) {
      this._clusterSource.destroy();
    }
  }

  _initActiveSourceAndStyle() {
    this._documentSource = this._source; // VectorLayer constructor sets _source as document source
    this._documentStyle = this._style; // VectorLayer constructor sets _style as document source

    this._initClusterSourceAndStyle();

    this._activeSource = this._documentSource;
    this._activeStyle = this._documentStyle;
    const sourceDataRequest = this.getSourceDataRequest();
    if (sourceDataRequest) {
      const requestMeta = sourceDataRequest.getMeta();
      if (requestMeta && requestMeta.sourceType === ES_GEO_GRID) {
        this._activeSource = this._clusterSource;
        this._activeStyle = this._clusterStyle;
      }
    }
  }

  _initClusterSourceAndStyle() {
    // derive cluster source from document source
    const clusterSourceDescriptor = ESGeoGridSource.createDescriptor({
      indexPatternId: this._documentSource.getIndexPatternId(),
      geoField: this._documentSource.getGeoFieldName(),
      requestType: RENDER_AS.POINT,
    });
    clusterSourceDescriptor.metrics = [
      {
        type: AGG_TYPE.COUNT,
        label: COUNT_PROP_LABEL,
      },
      ...this._documentStyle.getDynamicPropertiesArray().map(dynamicProperty => {
        return {
          type: getAggType(dynamicProperty),
          field: dynamicProperty.getFieldName(),
        };
      }),
    ];
    this._clusterSource = new ESGeoGridSource(
      clusterSourceDescriptor,
      this._documentSource.getInspectorAdapters()
    );

    // derive cluster style from document style
    const defaultDynamicProperties = getDefaultDynamicProperties();
    const clusterStyleDescriptor = {
      ...this._documentStyle._descriptor,
      properties: {
        [VECTOR_STYLES.LABEL_TEXT]: {
          type: DynamicStyleProperty.type,
          options: {
            ...defaultDynamicProperties[VECTOR_STYLES.LABEL_TEXT].options,
            field: {
              name: COUNT_PROP_NAME,
              origin: SOURCE_DATA_ID_ORIGIN,
            },
          },
        },
        [VECTOR_STYLES.ICON_SIZE]: {
          type: DynamicStyleProperty.type,
          options: {
            ...defaultDynamicProperties[VECTOR_STYLES.ICON_SIZE].options,
            field: {
              name: COUNT_PROP_NAME,
              origin: SOURCE_DATA_ID_ORIGIN,
            },
          },
        },
      },
    };
    this._documentStyle.getAllStyleProperties().forEach(styleProperty => {
      const styleName = styleProperty.getStyleName();
      if (
        [VECTOR_STYLES.LABEL_TEXT, VECTOR_STYLES.ICON_SIZE].includes(styleName) &&
        (!styleProperty.isDynamic() || !styleProperty.isComplete())
      ) {
        // Do not migrate static label and icon size properties to provide unique cluster styling out of the box
        return;
      }

      const options = styleProperty.getOptions();
      if (styleProperty.isDynamic()) {
        clusterStyleDescriptor.properties[styleName] = {
          type: DynamicStyleProperty.type,
          options: {
            ...options,
            field: {
              ...options.field,
              name: this._clusterSource.getAggKey(getAggType(styleProperty), options.field.name),
            },
          },
        };
      } else {
        clusterStyleDescriptor.properties[styleName] = {
          type: StaticStyleProperty.type,
          options: { ...options },
        };
      }
    });
    this._clusterStyle = new VectorStyle(clusterStyleDescriptor, this._clusterSource, this);
  }

  isJoinable() {
    return false;
  }

  getJoins() {
    return [];
  }

  getSource() {
    return this._activeSource;
  }

  getSourceForEditing() {
    // Layer is based on this._documentSource
    // this._clusterSource is a derived source for rendering only.
    // Regardless of this._activeSource, this._documentSource should always be displayed in the editor
    return this._documentSource;
  }

  getCurrentStyle() {
    return this._activeStyle;
  }

  getStyleForEditing() {
    return this._documentStyle;
  }

  async syncData(syncContext: unknown) {
    const searchFilters = this._getSearchFilters(syncContext.dataFilters);
    const canSkipFetch = await canSkipSourceUpdate({
      source: this.getSource(),
      prevDataRequest: this.getSourceDataRequest(),
      nextMeta: searchFilters,
    });
    if (!canSkipFetch) {
      const searchSource = await this._documentSource.makeSearchSource(searchFilters, 0);
      const resp = await searchSource.fetch();
      const maxResultWindow = await this._documentSource.getMaxResultWindow();
      if (resp.hits.total > maxResultWindow) {
        this._activeSource = this._clusterSource;
        this._activeStyle = this._clusterStyle;
      } else {
        this._activeSource = this._documentSource;
        this._activeStyle = this._documentStyle;
      }
    }

    super.syncData(syncContext);
  }

  /* syncLayerWithMB(mbMap) {}*/
}
