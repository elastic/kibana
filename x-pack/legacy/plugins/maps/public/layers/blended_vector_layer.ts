/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorLayer } from './vector_layer';
import { IVectorStyle, VectorStyle } from './styles/vector/vector_style';
// @ts-ignore
import { getDefaultDynamicProperties, VECTOR_STYLES } from './styles/vector/vector_style_defaults';
import { IDynamicStyleProperty } from './styles/vector/properties/dynamic_style_property';
import { IStyleProperty } from './styles/vector/properties/style_property';
import {
  COUNT_PROP_LABEL,
  COUNT_PROP_NAME,
  ES_GEO_GRID,
  LAYER_TYPE,
  AGG_TYPE,
  SOURCE_DATA_ID_ORIGIN,
  RENDER_AS,
  STYLE_TYPE,
} from '../../common/constants';
import { ESGeoGridSource } from './sources/es_geo_grid_source/es_geo_grid_source';
// @ts-ignore
import { canSkipSourceUpdate } from './util/can_skip_fetch';
import { IVectorLayer, VectorLayerArguments } from './vector_layer';
import { IESSource } from './sources/es_source';
import { IESAggSource } from './sources/es_agg_source';

function getAggType(dynamicProperty: IDynamicStyleProperty): AGG_TYPE {
  return dynamicProperty.isOrdinal() ? AGG_TYPE.AVG : AGG_TYPE.TERMS;
}

function getClusterSource(documentSource: IESSource, documentStyle: IVectorStyle): IESAggSource {
  const clusterSourceDescriptor = ESGeoGridSource.createDescriptor({
    indexPatternId: documentSource.getIndexPatternId(),
    geoField: documentSource.getGeoFieldName(),
    requestType: RENDER_AS.POINT,
  });
  clusterSourceDescriptor.metrics = [
    {
      type: AGG_TYPE.COUNT,
      label: COUNT_PROP_LABEL,
    },
    ...documentStyle.getDynamicPropertiesArray().map(dynamicProperty => {
      return {
        type: getAggType(dynamicProperty),
        field: dynamicProperty.getFieldName(),
      };
    }),
  ];
  return new ESGeoGridSource(clusterSourceDescriptor, documentSource.getInspectorAdapters());
}

function getClusterStyleDescriptor(
  documentStyle: IVectorStyle,
  clusterSource: IESAggSource
): unknown {
  const defaultDynamicProperties = getDefaultDynamicProperties();
  const clusterStyleDescriptor: any = {
    ...documentStyle.getDescriptor(),
    properties: {
      [VECTOR_STYLES.LABEL_TEXT]: {
        type: STYLE_TYPE.DYNAMIC,
        options: {
          ...defaultDynamicProperties[VECTOR_STYLES.LABEL_TEXT].options,
          field: {
            name: COUNT_PROP_NAME,
            origin: SOURCE_DATA_ID_ORIGIN,
          },
        },
      },
      [VECTOR_STYLES.ICON_SIZE]: {
        type: STYLE_TYPE.DYNAMIC,
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
  documentStyle.getAllStyleProperties().forEach((styleProperty: IStyleProperty) => {
    const styleName = styleProperty.getStyleName();
    if (
      [VECTOR_STYLES.LABEL_TEXT, VECTOR_STYLES.ICON_SIZE].includes(styleName) &&
      (!styleProperty.isDynamic() || !styleProperty.isComplete())
    ) {
      // Do not migrate static label and icon size properties to provide unique cluster styling out of the box
      return;
    }

    if (styleProperty.isDynamic() && styleProperty.isComplete()) {
      const options = (styleProperty as IDynamicStyleProperty).getOptions();
      clusterStyleDescriptor.properties[styleName] = {
        type: STYLE_TYPE.DYNAMIC,
        options: {
          ...options,
          field: {
            ...options.field,
            name: clusterSource.getAggKey(
              getAggType(styleProperty as IDynamicStyleProperty),
              // @ts-ignore styleProperty.isComplete() check ensures options.field.name exists
              options.field.name
            ),
          },
        },
      };
    } else {
      clusterStyleDescriptor.properties[styleName] = {
        type: STYLE_TYPE.STATIC,
        options: { ...styleProperty.getOptions() },
      };
    }
  });

  return clusterStyleDescriptor;
}

export class BlendedVectorLayer extends VectorLayer implements IVectorLayer {
  static type = LAYER_TYPE.BLENDED_VECTOR;

  static createDescriptor(options: VectorLayerArguments, mapColors: string[]) {
    const layerDescriptor = VectorLayer.createDescriptor(options, mapColors);
    layerDescriptor.type = BlendedVectorLayer.type;
    return layerDescriptor;
  }

  private _activeSource: IESSource;
  private _activeStyle: IVectorStyle;
  private readonly _clusterSource: IESAggSource;
  private readonly _clusterStyle: IVectorStyle;
  private readonly _documentSource: IESSource;
  private readonly _documentStyle: IVectorStyle;

  constructor(options: VectorLayerArguments) {
    super(options);

    this._documentSource = this._source as IESSource; // VectorLayer constructor sets _source as document source
    this._documentStyle = this._style; // VectorLayer constructor sets _style as document source

    this._clusterSource = getClusterSource(this._documentSource, this._documentStyle);
    const clusterStyleDescriptor = getClusterStyleDescriptor(
      this._documentStyle,
      this._clusterSource
    );
    this._clusterStyle = new VectorStyle(clusterStyleDescriptor, this._clusterSource, this);

    this._activeSource = this._documentSource;
    this._activeStyle = this._documentStyle;
    const sourceDataRequest = this.getSourceDataRequest();
    if (sourceDataRequest) {
      const requestMeta = sourceDataRequest.getMeta();
      if (requestMeta && requestMeta.sourceType && requestMeta.sourceType === ES_GEO_GRID) {
        this._activeSource = this._clusterSource;
        this._activeStyle = this._clusterStyle;
      }
    }
  }

  destroy() {
    if (this._documentSource) {
      this._documentSource.destroy();
    }
    if (this._clusterSource) {
      this._clusterSource.destroy();
    }
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
    // @ts-ignore
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
