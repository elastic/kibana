/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { VectorStyleEditor } from './components/vector_style_editor';
import { getDefaultProperties, vectorStyles } from './vector_style_defaults';
import { AbstractStyle } from '../abstract_style';
import { SOURCE_DATA_ID_ORIGIN, GEO_JSON_TYPE } from '../../../../common/constants';
import { VectorIcon } from './components/legend/vector_icon';
import { VectorStyleLegend } from './components/legend/vector_style_legend';
import { VECTOR_SHAPE_TYPES } from '../../sources/vector_feature_types';
import { SYMBOLIZE_AS_CIRCLE, SYMBOLIZE_AS_ICON } from './vector_constants';
import { getMakiSymbolAnchor } from './symbol_utils';
import { getComputedFieldName, getComputedFieldNamePrefix } from './style_util';
import { StaticStyleProperty } from './properties/static_style_property';
import { DynamicStyleProperty } from './properties/dynamic_style_property';
import { DynamicSizeProperty } from './properties/dynamic_size_property';
import { StaticSizeProperty } from './properties/static_size_property';
import { StaticColorProperty } from './properties/static_color_property';
import { DynamicColorProperty } from './properties/dynamic_color_property';
import { StaticOrientationProperty } from './properties/static_orientation_property';
import { DynamicOrientationProperty } from './properties/dynamic_orientation_property';

const POINTS = [GEO_JSON_TYPE.POINT, GEO_JSON_TYPE.MULTI_POINT];
const LINES = [GEO_JSON_TYPE.LINE_STRING, GEO_JSON_TYPE.MULTI_LINE_STRING];
const POLYGONS = [GEO_JSON_TYPE.POLYGON, GEO_JSON_TYPE.MULTI_POLYGON];

export class VectorStyle extends AbstractStyle {

  static type = 'VECTOR';
  static STYLE_TYPE = { 'DYNAMIC': DynamicStyleProperty.type, 'STATIC': StaticStyleProperty.type };

  static getComputedFieldName = getComputedFieldName;
  static getComputedFieldNamePrefix = getComputedFieldNamePrefix;

  constructor(descriptor = {}, source) {
    super();
    this._source = source;
    this._descriptor = {
      ...descriptor,
      ...VectorStyle.createDescriptor(descriptor.properties),
    };

    this._lineColorStyleProperty = this._makeColorProperty(this._descriptor.properties[vectorStyles.LINE_COLOR], vectorStyles.LINE_COLOR);
    this._fillColorStyleProperty = this._makeColorProperty(this._descriptor.properties[vectorStyles.FILL_COLOR], vectorStyles.FILL_COLOR);
    this._lineWidthStyleProperty = this._makeSizeProperty(this._descriptor.properties[vectorStyles.LINE_WIDTH], vectorStyles.LINE_WIDTH);
    this._iconSizeStyleProperty = this._makeSizeProperty(this._descriptor.properties[vectorStyles.ICON_SIZE], vectorStyles.ICON_SIZE);
    // eslint-disable-next-line max-len
    this._iconOrientationProperty = this._makeOrientationProperty(this._descriptor.properties[vectorStyles.ICON_ORIENTATION], vectorStyles.ICON_ORIENTATION);
  }

  static createDescriptor(properties = {}) {
    return {
      type: VectorStyle.type,
      properties: { ...getDefaultProperties(), ...properties }
    };
  }

  static createDefaultStyleProperties(mapColors) {
    return getDefaultProperties(mapColors);
  }

  static getDisplayName() {
    return i18n.translate('xpack.maps.style.vector.displayNameLabel', {
      defaultMessage: 'Vector style'
    });
  }

  static description = '';

  renderEditor({ layer, onStyleDescriptorChange }) {
    const styleProperties = { ...this.getProperties() };
    const handlePropertyChange = (propertyName, settings) => {
      styleProperties[propertyName] = settings;//override single property, but preserve the rest
      const vectorStyleDescriptor = VectorStyle.createDescriptor(styleProperties);
      onStyleDescriptorChange(vectorStyleDescriptor);
    };

    return (
      <VectorStyleEditor
        handlePropertyChange={handlePropertyChange}
        styleProperties={styleProperties}
        layer={layer}
        loadIsPointsOnly={this._getIsPointsOnly}
        loadIsLinesOnly={this._getIsLinesOnly}
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
    const originalProperties = this.getProperties();
    const updatedProperties = {};
    Object.keys(originalProperties).forEach(propertyName => {
      if (!this._isPropertyDynamic(propertyName)) {
        return;
      }

      const fieldName = _.get(originalProperties[propertyName], 'options.field.name');
      if (!fieldName) {
        return;
      }

      const matchingOrdinalField = nextOrdinalFields.find(oridinalField => {
        return fieldName === oridinalField.name;
      });

      if (matchingOrdinalField) {
        return;
      }

      updatedProperties[propertyName] = {
        type: VectorStyle.STYLE_TYPE.DYNAMIC,
        options: {
          ...originalProperties[propertyName].options
        }
      };
      delete updatedProperties[propertyName].options.field;
    });

    if (Object.keys(updatedProperties).length === 0) {
      return {
        hasChanges: false,
        nextStyleDescriptor: { ...this._descriptor },
      };
    }

    return {
      hasChanges: true,
      nextStyleDescriptor: VectorStyle.createDescriptor({
        ...originalProperties,
        ...updatedProperties,
      })
    };
  }

  async pluckStyleMetaFromSourceDataRequest(sourceDataRequest) {
    const features = _.get(sourceDataRequest.getData(), 'features', []);
    if (features.length === 0) {
      return {};
    }

    const scaledFields = this.getDynamicPropertiesArray()
      .map(({ options }) => {
        return {
          name: options.field.name,
          min: Infinity,
          max: -Infinity
        };
      });

    const supportedFeatures = await this._source.getSupportedShapeTypes();
    const isSingleFeatureType = supportedFeatures.length === 1;

    if (scaledFields.length === 0 && isSingleFeatureType) {
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

      for (let j = 0; j < scaledFields.length; j++) {
        const scaledField = scaledFields[j];
        const newValue = parseFloat(feature.properties[scaledField.name]);
        if (!isNaN(newValue)) {
          scaledField.min = Math.min(scaledField.min, newValue);
          scaledField.max = Math.max(scaledField.max, newValue);
        }
      }
    }

    const featuresMeta = {
      hasFeatureType: {
        [VECTOR_SHAPE_TYPES.POINT]: hasPoints,
        [VECTOR_SHAPE_TYPES.LINE]: hasLines,
        [VECTOR_SHAPE_TYPES.POLYGON]: hasPolygons
      }
    };

    scaledFields.forEach(({ min, max, name }) => {
      if (min !== Infinity && max !== -Infinity) {
        featuresMeta[name] = {
          min,
          max,
          delta: max - min,
        };
      }
    });

    return featuresMeta;
  }

  getSourceFieldNames() {
    const properties = this.getProperties();
    const fieldNames = [];
    Object.keys(properties).forEach(propertyName => {
      if (!this._isPropertyDynamic(propertyName)) {
        return;
      }

      const field = _.get(properties[propertyName], 'options.field', {});
      if (field.origin === SOURCE_DATA_ID_ORIGIN && field.name) {
        fieldNames.push(field.name);
      }
    });

    return fieldNames;
  }

  getProperties() {
    return this._descriptor.properties || {};
  }

  getDynamicPropertiesArray() {
    const styles = this.getProperties();
    return Object.keys(styles)
      .map(styleName => {
        const { type, options } = styles[styleName];
        return {
          styleName,
          type,
          options
        };
      })
      .filter(({ styleName }) => {
        return this._isPropertyDynamic(styleName);
      });
  }

  _isPropertyDynamic(propertyName) {
    const { type, options } = _.get(this._descriptor, ['properties', propertyName], {});
    return type === VectorStyle.STYLE_TYPE.DYNAMIC && options.field && options.field.name;
  }

  _checkIfOnlyFeatureType = async (featureType) => {
    const supportedFeatures = await this._source.getSupportedShapeTypes();

    if (supportedFeatures.length === 1) {
      return supportedFeatures[0] === featureType;
    }

    if (!this._descriptor.__styleMeta || !this._descriptor.__styleMeta.hasFeatureType) {
      return false;
    }

    const featureTypes = Object.keys(this._descriptor.__styleMeta.hasFeatureType);
    return featureTypes.reduce((isOnlySingleFeatureType, featureTypeKey) => {
      const hasFeature = this._descriptor.__styleMeta.hasFeatureType[featureTypeKey];
      return featureTypeKey === featureType
        ? isOnlySingleFeatureType && hasFeature
        : isOnlySingleFeatureType && !hasFeature;
    }, true);
  }

  _getIsPointsOnly = async () => {
    return this._checkIfOnlyFeatureType(VECTOR_SHAPE_TYPES.POINT);
  }

  _getIsLinesOnly = async () => {
    return this._checkIfOnlyFeatureType(VECTOR_SHAPE_TYPES.LINE);
  }

  _getIsPolygonsOnly = async () => {
    return this._checkIfOnlyFeatureType(VECTOR_SHAPE_TYPES.POLYGON);
  }

  _getFieldRange = (fieldName) => {
    return _.get(this._descriptor, ['__styleMeta', fieldName]);
  }

  getIcon = () => {
    const styles = this.getProperties();
    const symbolId = this.arePointsSymbolizedAsCircles()
      ? undefined
      : this._descriptor.properties.symbol.options.symbolId;
    return (
      <VectorIcon
        loadIsPointsOnly={this._getIsPointsOnly}
        loadIsLinesOnly={this._getIsLinesOnly}
        fillColor={styles.fillColor}
        lineColor={styles.lineColor}
        symbolId={symbolId}
      />
    );
  }

  getLegendDetails(getFieldLabel, getFieldFormatter) {
    const styles = this.getProperties();
    const styleProperties = Object.keys(styles).map(styleName => {
      const { type, options } = styles[styleName];
      return {
        name: styleName,
        type,
        options,
        range: options && options.field && options.field.name ? this._getFieldRange(options.field.name) : null,
      };
    });

    return (
      <VectorStyleLegend
        styleProperties={styleProperties}
        getFieldLabel={getFieldLabel}
        getFieldFormatter={getFieldFormatter}
      />
    );
  }

  _getStyleFields() {
    return this.getDynamicPropertiesArray()
      .map(({ styleName, options }) => {
        const name = options.field.name;

        // "feature-state" data expressions are not supported with layout properties.
        // To work around this limitation, some styling values must fall back to geojson property values.
        let supportsFeatureState;
        let isScaled;
        if (styleName === 'iconSize'
          && this._descriptor.properties.symbol.options.symbolizeAs === SYMBOLIZE_AS_ICON) {
          supportsFeatureState = false;
          isScaled = true;
        } else if (styleName === 'iconOrientation') {
          supportsFeatureState = false;
          isScaled = false;
        } else if ((styleName === vectorStyles.FILL_COLOR || styleName === vectorStyles.LINE_COLOR)
          && options.useCustomColorRamp) {
          supportsFeatureState = true;
          isScaled = false;
        } else {
          supportsFeatureState = true;
          isScaled = true;
        }

        return {
          supportsFeatureState,
          isScaled,
          name,
          range: this._getFieldRange(name),
          computedName: VectorStyle.getComputedFieldName(styleName, name),
        };
      });
  }

  clearFeatureState(featureCollection, mbMap, sourceId) {
    const tmpFeatureIdentifier = {
      source: null,
      id: null
    };
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];
      tmpFeatureIdentifier.source = sourceId;
      tmpFeatureIdentifier.id = feature.id;
      mbMap.removeFeatureState(tmpFeatureIdentifier);
    }
  }

  setFeatureState(featureCollection, mbMap, sourceId) {

    if (!featureCollection) {
      return;
    }

    const styleFields  = this._getStyleFields();
    if (styleFields.length === 0) {
      return;
    }

    const tmpFeatureIdentifier = {
      source: null,
      id: null
    };
    const tmpFeatureState = {};

    //scale to [0,1] domain
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];

      for (let j = 0; j < styleFields.length; j++) {
        const { supportsFeatureState, isScaled, name, range, computedName } = styleFields[j];
        const value = parseFloat(feature.properties[name]);
        let styleValue;
        if (isScaled) {
          if (isNaN(value) || !range) {//cannot scale
            styleValue = -1;//put outside range
          } else if (range.delta === 0) {//values are identical
            styleValue = 1;//snap to end of color range
          } else {
            styleValue = (value - range.min) / range.delta;
          }
        } else {
          if (isNaN(value)) {
            styleValue = 0;
          } else {
            styleValue = value;
          }
        }

        if (supportsFeatureState) {
          tmpFeatureState[computedName] = styleValue;
        } else {
          feature.properties[computedName] = styleValue;
        }
      }
      tmpFeatureIdentifier.source = sourceId;
      tmpFeatureIdentifier.id = feature.id;
      mbMap.setFeatureState(tmpFeatureIdentifier, tmpFeatureState);
    }

    const hasGeoJsonProperties = styleFields.some(({ supportsFeatureState }) => {
      return !supportsFeatureState;
    });
    return hasGeoJsonProperties;
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

  _makeSizeProperty(descriptor, styleName) {
    if (!descriptor || !descriptor.options) {
      return new StaticSizeProperty({ size: 0 }, styleName);
    } else if (descriptor.type === StaticStyleProperty.type) {
      return new StaticSizeProperty(descriptor.options, styleName);
    } else if (descriptor.type === DynamicStyleProperty.type) {
      return new DynamicSizeProperty(descriptor.options, styleName);
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
      return new DynamicColorProperty(descriptor.options, styleName);
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
      return new DynamicOrientationProperty(descriptor.options, styleName);
    } else {
      throw new Error(`${descriptor} not implemented`);
    }
  }
}
