/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { VectorStyleEditor } from './components/vector_style_editor';
import {
  getDefaultProperties,
  LINE_STYLES,
  POLYGON_STYLES,
  VECTOR_STYLES,
} from './vector_style_defaults';
import { AbstractStyle } from '../abstract_style';
import {
  GEO_JSON_TYPE,
  FIELD_ORIGIN,
  STYLE_TYPE,
  SOURCE_META_ID_ORIGIN,
  SOURCE_FORMATTERS_ID_ORIGIN,
  LAYER_STYLE_TYPE,
} from '../../../../common/constants';
import { VectorIcon } from './components/legend/vector_icon';
import { VectorStyleLegend } from './components/legend/vector_style_legend';
import { VECTOR_SHAPE_TYPES } from '../../sources/vector_feature_types';
import { SYMBOLIZE_AS_CIRCLE, SYMBOLIZE_AS_ICON } from './vector_constants';
import { getMakiSymbolAnchor } from './symbol_utils';
import { getComputedFieldName, isOnlySingleFeatureType } from './style_util';
import { StaticStyleProperty } from './properties/static_style_property';
import { DynamicStyleProperty } from './properties/dynamic_style_property';
import { DynamicSizeProperty } from './properties/dynamic_size_property';
import { StaticSizeProperty } from './properties/static_size_property';
import { StaticColorProperty } from './properties/static_color_property';
import { DynamicColorProperty } from './properties/dynamic_color_property';
import { StaticOrientationProperty } from './properties/static_orientation_property';
import { DynamicOrientationProperty } from './properties/dynamic_orientation_property';
import { StaticTextProperty } from './properties/static_text_property';
import { DynamicTextProperty } from './properties/dynamic_text_property';
import { extractColorFromStyleProperty } from './components/legend/extract_color_from_style_property';

const POINTS = [GEO_JSON_TYPE.POINT, GEO_JSON_TYPE.MULTI_POINT];
const LINES = [GEO_JSON_TYPE.LINE_STRING, GEO_JSON_TYPE.MULTI_LINE_STRING];
const POLYGONS = [GEO_JSON_TYPE.POLYGON, GEO_JSON_TYPE.MULTI_POLYGON];

export class VectorStyle extends AbstractStyle {
  static type = LAYER_STYLE_TYPE.VECTOR;
  static STYLE_TYPE = STYLE_TYPE;
  static createDescriptor(properties = {}, isTimeAware = true) {
    return {
      type: VectorStyle.type,
      properties: { ...getDefaultProperties(), ...properties },
      isTimeAware,
    };
  }

  static createDefaultStyleProperties(mapColors) {
    return getDefaultProperties(mapColors);
  }

  constructor(descriptor = {}, source, layer) {
    super();
    this._source = source;
    this._layer = layer;
    this._descriptor = {
      ...descriptor,
      ...VectorStyle.createDescriptor(descriptor.properties, descriptor.isTimeAware),
    };

    this._lineColorStyleProperty = this._makeColorProperty(
      this._descriptor.properties[VECTOR_STYLES.LINE_COLOR],
      VECTOR_STYLES.LINE_COLOR
    );
    this._fillColorStyleProperty = this._makeColorProperty(
      this._descriptor.properties[VECTOR_STYLES.FILL_COLOR],
      VECTOR_STYLES.FILL_COLOR
    );
    this._lineWidthStyleProperty = this._makeSizeProperty(
      this._descriptor.properties[VECTOR_STYLES.LINE_WIDTH],
      VECTOR_STYLES.LINE_WIDTH
    );
    this._iconSizeStyleProperty = this._makeSizeProperty(
      this._descriptor.properties[VECTOR_STYLES.ICON_SIZE],
      VECTOR_STYLES.ICON_SIZE,
      this._descriptor.properties[VECTOR_STYLES.SYMBOL].options.symbolizeAs === SYMBOLIZE_AS_ICON
    );
    this._iconOrientationProperty = this._makeOrientationProperty(
      this._descriptor.properties[VECTOR_STYLES.ICON_ORIENTATION],
      VECTOR_STYLES.ICON_ORIENTATION
    );
    this._labelStyleProperty = this._makeLabelProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_TEXT]
    );
    this._labelSizeStyleProperty = this._makeSizeProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_SIZE],
      VECTOR_STYLES.LABEL_SIZE
    );
    this._labelColorStyleProperty = this._makeColorProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_COLOR],
      VECTOR_STYLES.LABEL_COLOR
    );
  }

  _getAllStyleProperties() {
    return [
      this._lineColorStyleProperty,
      this._fillColorStyleProperty,
      this._lineWidthStyleProperty,
      this._iconSizeStyleProperty,
      this._iconOrientationProperty,
      this._labelStyleProperty,
      this._labelSizeStyleProperty,
      this._labelColorStyleProperty,
    ];
  }

  renderEditor({ layer, onStyleDescriptorChange }) {
    const rawProperties = this.getRawProperties();
    const handlePropertyChange = (propertyName, settings) => {
      rawProperties[propertyName] = settings; //override single property, but preserve the rest
      const vectorStyleDescriptor = VectorStyle.createDescriptor(rawProperties, this.isTimeAware());
      onStyleDescriptorChange(vectorStyleDescriptor);
    };

    const onIsTimeAwareChange = isTimeAware => {
      const vectorStyleDescriptor = VectorStyle.createDescriptor(rawProperties, isTimeAware);
      onStyleDescriptorChange(vectorStyleDescriptor);
    };

    const propertiesWithFieldMeta = this.getDynamicPropertiesArray().filter(dynamicStyleProp => {
      return dynamicStyleProp.isFieldMetaEnabled();
    });

    const styleProperties = {};
    this._getAllStyleProperties().forEach(styleProperty => {
      styleProperties[styleProperty.getStyleName()] = styleProperty;
    });

    return (
      <VectorStyleEditor
        handlePropertyChange={handlePropertyChange}
        styleProperties={styleProperties}
        symbolDescriptor={this._descriptor.properties[VECTOR_STYLES.SYMBOL]}
        layer={layer}
        loadIsPointsOnly={this._getIsPointsOnly}
        loadIsLinesOnly={this._getIsLinesOnly}
        onIsTimeAwareChange={onIsTimeAwareChange}
        isTimeAware={this.isTimeAware()}
        showIsTimeAware={propertiesWithFieldMeta.length > 0}
      />
    );
  }

  /*
   * Changes to source descriptor and join descriptor will impact style properties.
   * For instance, a style property may be dynamically tied to the value of an ordinal field defined
   * by a join or a metric aggregation. The metric aggregation or join may be edited or removed.
   * When this happens, the style will be linked to a no-longer-existing ordinal field.
   * This method provides a way for a style to clean itself and return a descriptor that unsets any dynamic
   * properties that are tied to missing oridinal fields
   *
   * This method does not update its descriptor. It just returns a new descriptor that the caller
   * can then use to update store state via dispatch.
   */
  getDescriptorWithMissingStylePropsRemoved(nextOrdinalFields) {
    const originalProperties = this.getRawProperties();
    const updatedProperties = {};

    const dynamicProperties = Object.keys(originalProperties).filter(key => {
      const { type, options } = originalProperties[key] || {};
      return type === STYLE_TYPE.DYNAMIC && options.field && options.field.name;
    });

    dynamicProperties.forEach(key => {
      const dynamicProperty = originalProperties[key];
      const fieldName =
        dynamicProperty && dynamicProperty.options.field && dynamicProperty.options.field.name;
      if (!fieldName) {
        return;
      }

      const matchingOrdinalField = nextOrdinalFields.find(ordinalField => {
        return fieldName === ordinalField.getName();
      });

      if (matchingOrdinalField) {
        return;
      }

      updatedProperties[key] = {
        type: DynamicStyleProperty.type,
        options: {
          ...originalProperties[key].options,
        },
      };
      delete updatedProperties[key].options.field;
    });

    if (Object.keys(updatedProperties).length === 0) {
      return {
        hasChanges: false,
        nextStyleDescriptor: { ...this._descriptor },
      };
    }

    return {
      hasChanges: true,
      nextStyleDescriptor: VectorStyle.createDescriptor(
        {
          ...originalProperties,
          ...updatedProperties,
        },
        this.isTimeAware()
      ),
    };
  }

  async pluckStyleMetaFromSourceDataRequest(sourceDataRequest) {
    const features = _.get(sourceDataRequest.getData(), 'features', []);
    if (features.length === 0) {
      return {};
    }

    const dynamicProperties = this.getDynamicPropertiesArray();

    const supportedFeatures = await this._source.getSupportedShapeTypes();
    const isSingleFeatureType = supportedFeatures.length === 1;
    if (dynamicProperties.length === 0 && isSingleFeatureType) {
      // no meta data to pull from source data request.
      return {};
    }

    let hasPoints = false;
    let hasLines = false;
    let hasPolygons = false;
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (!hasPoints && POINTS.includes(feature.geometry.type)) {
        hasPoints = true;
      }
      if (!hasLines && LINES.includes(feature.geometry.type)) {
        hasLines = true;
      }
      if (!hasPolygons && POLYGONS.includes(feature.geometry.type)) {
        hasPolygons = true;
      }
    }

    const featuresMeta = {
      hasFeatureType: {
        [VECTOR_SHAPE_TYPES.POINT]: hasPoints,
        [VECTOR_SHAPE_TYPES.LINE]: hasLines,
        [VECTOR_SHAPE_TYPES.POLYGON]: hasPolygons,
      },
    };

    dynamicProperties.forEach(dynamicProperty => {
      const styleMeta = dynamicProperty.pluckStyleMetaFromFeatures(features);
      if (styleMeta) {
        const name = dynamicProperty.getField().getName();
        featuresMeta[name] = styleMeta;
      }
    });

    return featuresMeta;
  }

  getSourceFieldNames() {
    const fieldNames = [];
    this.getDynamicPropertiesArray().forEach(styleProperty => {
      if (styleProperty.getFieldOrigin() === FIELD_ORIGIN.SOURCE) {
        fieldNames.push(styleProperty.getField().getName());
      }
    });
    return fieldNames;
  }

  isTimeAware() {
    return this._descriptor.isTimeAware;
  }

  getRawProperties() {
    return this._descriptor.properties || {};
  }

  getDynamicPropertiesArray() {
    const styleProperties = this._getAllStyleProperties();
    return styleProperties.filter(
      styleProperty => styleProperty.isDynamic() && styleProperty.isComplete()
    );
  }

  _isOnlySingleFeatureType = async featureType => {
    return isOnlySingleFeatureType(
      featureType,
      await this._source.getSupportedShapeTypes(),
      this._getStyleMeta().hasFeatureType
    );
  };

  _getIsPointsOnly = async () => {
    return this._isOnlySingleFeatureType(VECTOR_SHAPE_TYPES.POINT);
  };

  _getIsLinesOnly = async () => {
    return this._isOnlySingleFeatureType(VECTOR_SHAPE_TYPES.LINE);
  };

  _getIsPolygonsOnly = async () => {
    return this._isOnlySingleFeatureType(VECTOR_SHAPE_TYPES.POLYGON);
  };

  _getDynamicPropertyByFieldName(fieldName) {
    const dynamicProps = this.getDynamicPropertiesArray();
    return dynamicProps.find(dynamicProp => {
      return fieldName === dynamicProp.getField().getName();
    });
  }

  _getFieldMeta = fieldName => {
    const fieldMetaFromLocalFeatures = _.get(this._descriptor, ['__styleMeta', fieldName]);

    const dynamicProp = this._getDynamicPropertyByFieldName(fieldName);
    if (!dynamicProp || !dynamicProp.isFieldMetaEnabled()) {
      return fieldMetaFromLocalFeatures;
    }

    let dataRequestId;
    if (dynamicProp.getFieldOrigin() === FIELD_ORIGIN.SOURCE) {
      dataRequestId = SOURCE_META_ID_ORIGIN;
    } else {
      const join = this._layer.getValidJoins().find(join => {
        return join.getRightJoinSource().hasMatchingMetricField(fieldName);
      });
      if (join) {
        dataRequestId = join.getSourceMetaDataRequestId();
      }
    }

    if (!dataRequestId) {
      return fieldMetaFromLocalFeatures;
    }

    const styleMetaDataRequest = this._layer._findDataRequestById(dataRequestId);
    if (!styleMetaDataRequest || !styleMetaDataRequest.hasData()) {
      return fieldMetaFromLocalFeatures;
    }

    const data = styleMetaDataRequest.getData();
    const fieldMeta = dynamicProp.pluckStyleMetaFromFieldMetaData(data);
    return fieldMeta ? fieldMeta : fieldMetaFromLocalFeatures;
  };

  _getFieldFormatter = fieldName => {
    const dynamicProp = this._getDynamicPropertyByFieldName(fieldName);
    if (!dynamicProp) {
      return null;
    }

    let dataRequestId;
    if (dynamicProp.getFieldOrigin() === FIELD_ORIGIN.SOURCE) {
      dataRequestId = SOURCE_FORMATTERS_ID_ORIGIN;
    } else {
      const join = this._layer.getValidJoins().find(join => {
        return join.getRightJoinSource().hasMatchingMetricField(fieldName);
      });
      if (join) {
        dataRequestId = join.getSourceFormattersDataRequestId();
      }
    }

    if (!dataRequestId) {
      return null;
    }

    const formattersDataRequest = this._layer._findDataRequestById(dataRequestId);
    if (!formattersDataRequest || !formattersDataRequest.hasData()) {
      return null;
    }

    const formatters = formattersDataRequest.getData();
    return formatters[fieldName];
  };

  _getStyleMeta = () => {
    return _.get(this._descriptor, '__styleMeta', {});
  };

  _getSymbolId() {
    return this.arePointsSymbolizedAsCircles()
      ? undefined
      : this._descriptor.properties.symbol.options.symbolId;
  }

  _getColorForProperty = (styleProperty, isLinesOnly) => {
    const styles = this.getRawProperties();
    if (isLinesOnly) {
      return extractColorFromStyleProperty(styles[VECTOR_STYLES.LINE_COLOR], 'grey');
    }

    if (styleProperty === VECTOR_STYLES.LINE_COLOR) {
      return extractColorFromStyleProperty(styles[VECTOR_STYLES.LINE_COLOR], 'none');
    } else if (styleProperty === VECTOR_STYLES.FILL_COLOR) {
      return extractColorFromStyleProperty(styles[VECTOR_STYLES.FILL_COLOR], 'grey');
    } else {
      //unexpected
      console.error('Cannot return color for properties other then line or fill color');
    }
  };

  getIcon = () => {
    const symbolId = this._getSymbolId();

    return (
      <VectorIcon
        loadIsPointsOnly={this._getIsPointsOnly}
        loadIsLinesOnly={this._getIsLinesOnly}
        symbolId={symbolId}
        getColorForProperty={this._getColorForProperty}
      />
    );
  };

  _getLegendDetailStyleProperties = async () => {
    const isLinesOnly = await this._getIsLinesOnly();
    const isPolygonsOnly = await this._getIsPolygonsOnly();

    return this.getDynamicPropertiesArray().filter(styleProperty => {
      const styleName = styleProperty.getStyleName();
      if ([VECTOR_STYLES.ICON_ORIENTATION, VECTOR_STYLES.LABEL_TEXT].includes(styleName)) {
        return false;
      }

      if (isLinesOnly) {
        return LINE_STYLES.includes(styleName);
      }

      if (isPolygonsOnly) {
        return POLYGON_STYLES.includes(styleName);
      }

      return true;
    });
  };

  async hasLegendDetails() {
    const styles = await this._getLegendDetailStyleProperties();
    return styles.length > 0;
  }

  renderLegendDetails() {
    return (
      <VectorStyleLegend
        getLegendDetailStyleProperties={this._getLegendDetailStyleProperties}
        loadIsPointsOnly={this._getIsPointsOnly}
        loadIsLinesOnly={this._getIsLinesOnly}
        symbolId={this._getSymbolId()}
      />
    );
  }

  clearFeatureState(featureCollection, mbMap, sourceId) {
    const tmpFeatureIdentifier = {
      source: null,
      id: null,
    };
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];
      tmpFeatureIdentifier.source = sourceId;
      tmpFeatureIdentifier.id = feature.id;
      mbMap.removeFeatureState(tmpFeatureIdentifier);
    }
  }

  setFeatureStateAndStyleProps(featureCollection, mbMap, mbSourceId) {
    if (!featureCollection) {
      return;
    }

    const dynamicStyleProps = this.getDynamicPropertiesArray();
    if (dynamicStyleProps.length === 0) {
      return;
    }

    const tmpFeatureIdentifier = {
      source: null,
      id: null,
    };
    const tmpFeatureState = {};

    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];

      for (let j = 0; j < dynamicStyleProps.length; j++) {
        const dynamicStyleProp = dynamicStyleProps[j];
        const name = dynamicStyleProp.getField().getName();
        const computedName = getComputedFieldName(dynamicStyleProp.getStyleName(), name);
        const styleValue = dynamicStyleProp.getMbValue(feature.properties[name]);
        if (dynamicStyleProp.supportsFeatureState()) {
          tmpFeatureState[computedName] = styleValue;
        } else {
          feature.properties[computedName] = styleValue;
        }
      }
      tmpFeatureIdentifier.source = mbSourceId;
      tmpFeatureIdentifier.id = feature.id;
      mbMap.setFeatureState(tmpFeatureIdentifier, tmpFeatureState);
    }

    //returns boolean indicating if styles do not support feature-state and some values are stored in geojson properties
    //this return-value is used in an optimization for style-updates with mapbox-gl.
    //`true` indicates the entire data needs to reset on the source (otherwise the style-rules will not be reapplied)
    //`false` indicates the data does not need to be reset on the store, because styles are re-evaluated if they use featureState
    return dynamicStyleProps.some(dynamicStyleProp => !dynamicStyleProp.supportsFeatureState());
  }

  arePointsSymbolizedAsCircles() {
    return this._descriptor.properties.symbol.options.symbolizeAs === SYMBOLIZE_AS_CIRCLE;
  }

  setMBPaintProperties({ alpha, mbMap, fillLayerId, lineLayerId }) {
    this._fillColorStyleProperty.syncFillColorWithMb(fillLayerId, mbMap, alpha);
    this._lineColorStyleProperty.syncLineColorWithMb(lineLayerId, mbMap, alpha);
    this._lineWidthStyleProperty.syncLineWidthWithMb(lineLayerId, mbMap);
  }

  setMBPaintPropertiesForPoints({ alpha, mbMap, pointLayerId }) {
    this._fillColorStyleProperty.syncCircleColorWithMb(pointLayerId, mbMap, alpha);
    this._lineColorStyleProperty.syncCircleStrokeWithMb(pointLayerId, mbMap, alpha);
    this._lineWidthStyleProperty.syncCircleStrokeWidthWithMb(pointLayerId, mbMap);
    this._iconSizeStyleProperty.syncCircleRadiusWithMb(pointLayerId, mbMap);
  }

  setMBPropertiesForLabelText({ alpha, mbMap, textLayerId }) {
    mbMap.setLayoutProperty(textLayerId, 'icon-allow-overlap', true);
    mbMap.setLayoutProperty(textLayerId, 'text-allow-overlap', true);
    this._labelStyleProperty.syncTextFieldWithMb(textLayerId, mbMap);
    this._labelColorStyleProperty.syncLabelColorWithMb(textLayerId, mbMap, alpha);
    this._labelSizeStyleProperty.syncLabelSizeWithMb(textLayerId, mbMap);
  }

  setMBSymbolPropertiesForPoints({ mbMap, symbolLayerId, alpha }) {
    const symbolId = this._descriptor.properties.symbol.options.symbolId;
    mbMap.setLayoutProperty(symbolLayerId, 'icon-ignore-placement', true);
    mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', getMakiSymbolAnchor(symbolId));
    mbMap.setPaintProperty(symbolLayerId, 'icon-opacity', alpha);

    // icon-color is only supported on SDF icons.
    this._fillColorStyleProperty.syncIconColorWithMb(symbolLayerId, mbMap);
    this._lineColorStyleProperty.syncHaloBorderColorWithMb(symbolLayerId, mbMap);
    this._lineWidthStyleProperty.syncHaloWidthWithMb(symbolLayerId, mbMap);
    this._iconSizeStyleProperty.syncIconImageAndSizeWithMb(symbolLayerId, mbMap, symbolId);
    this._iconOrientationProperty.syncIconRotationWithMb(symbolLayerId, mbMap);
  }

  arePointsSymbolizedAsCircles() {
    return this._descriptor.properties.symbol.options.symbolizeAs === SYMBOLIZE_AS_CIRCLE;
  }

  _makeField(fieldDescriptor) {
    if (!fieldDescriptor || !fieldDescriptor.name) {
      return null;
    }

    //fieldDescriptor.label is ignored. This is essentially cruft duplicating label-info from the metric-selection
    //Ignore this custom label
    if (fieldDescriptor.origin === FIELD_ORIGIN.SOURCE) {
      return this._source.createField({
        fieldName: fieldDescriptor.name,
      });
    } else if (fieldDescriptor.origin === FIELD_ORIGIN.JOIN) {
      const join = this._layer.getValidJoins().find(join => {
        return join.getRightJoinSource().hasMatchingMetricField(fieldDescriptor.name);
      });
      return join ? join.getRightJoinSource().getMetricFieldForName(fieldDescriptor.name) : null;
    } else {
      throw new Error(`Unknown origin-type ${fieldDescriptor.origin}`);
    }
  }

  _makeSizeProperty(descriptor, styleName, isSymbolizedAsIcon) {
    if (!descriptor || !descriptor.options) {
      return new StaticSizeProperty({ size: 0 }, styleName);
    } else if (descriptor.type === StaticStyleProperty.type) {
      return new StaticSizeProperty(descriptor.options, styleName);
    } else if (descriptor.type === DynamicStyleProperty.type) {
      const field = this._makeField(descriptor.options.field);
      return new DynamicSizeProperty(
        descriptor.options,
        styleName,
        field,
        this._getFieldMeta,
        this._getFieldFormatter,
        isSymbolizedAsIcon
      );
    } else {
      throw new Error(`${descriptor} not implemented`);
    }
  }

  _makeColorProperty(descriptor, styleName) {
    if (!descriptor || !descriptor.options) {
      return new StaticColorProperty({ color: null }, styleName);
    } else if (descriptor.type === StaticStyleProperty.type) {
      return new StaticColorProperty(descriptor.options, styleName);
    } else if (descriptor.type === DynamicStyleProperty.type) {
      const field = this._makeField(descriptor.options.field);
      return new DynamicColorProperty(
        descriptor.options,
        styleName,
        field,
        this._getFieldMeta,
        this._getFieldFormatter
      );
    } else {
      throw new Error(`${descriptor} not implemented`);
    }
  }

  _makeOrientationProperty(descriptor, styleName) {
    if (!descriptor || !descriptor.options) {
      return new StaticOrientationProperty({ orientation: 0 }, styleName);
    } else if (descriptor.type === StaticStyleProperty.type) {
      return new StaticOrientationProperty(descriptor.options, styleName);
    } else if (descriptor.type === DynamicStyleProperty.type) {
      const field = this._makeField(descriptor.options.field);
      return new DynamicOrientationProperty(descriptor.options, styleName, field);
    } else {
      throw new Error(`${descriptor} not implemented`);
    }
  }

  _makeLabelProperty(descriptor) {
    if (!descriptor || !descriptor.options) {
      return new StaticTextProperty({ value: '' }, VECTOR_STYLES.LABEL_TEXT);
    } else if (descriptor.type === StaticStyleProperty.type) {
      return new StaticTextProperty(descriptor.options, VECTOR_STYLES.LABEL_TEXT);
    } else if (descriptor.type === DynamicStyleProperty.type) {
      const field = this._makeField(descriptor.options.field);
      return new DynamicTextProperty(
        descriptor.options,
        VECTOR_STYLES.LABEL_TEXT,
        field,
        this._getFieldMeta,
        this._getFieldFormatter
      );
    } else {
      throw new Error(`${descriptor} not implemented`);
    }
  }
}
