/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { CSSProperties, ReactElement } from 'react';
import { FeatureIdentifier, Map as MbMap } from '@kbn/mapbox-gl';
import { FeatureCollection } from 'geojson';
import { StyleProperties, VectorStyleEditor } from './components/vector_style_editor';
import {
  getDefaultStaticProperties,
  LABEL_STYLES,
  LINE_STYLES,
  POLYGON_STYLES,
} from './vector_style_defaults';
import {
  DEFAULT_ICON,
  FIELD_ORIGIN,
  ICON_SOURCE,
  LAYER_STYLE_TYPE,
  SOURCE_FORMATTERS_DATA_REQUEST_ID,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '../../../../common/constants';
import { StyleMeta } from './style_meta';
import { getMakiSymbol } from './symbol_utils';
import { VectorIcon } from './components/legend/vector_icon';
import { VectorStyleLegend } from './components/legend/vector_style_legend';
import { getHasLabel } from './style_util';
import { StaticStyleProperty } from './properties/static_style_property';
import { DynamicStyleProperty, IDynamicStyleProperty } from './properties/dynamic_style_property';
import { DynamicSizeProperty } from './properties/dynamic_size_property';
import { StaticSizeProperty } from './properties/static_size_property';
import { StaticColorProperty } from './properties/static_color_property';
import { DynamicColorProperty } from './properties/dynamic_color_property';
import { StaticOrientationProperty } from './properties/static_orientation_property';
import { DynamicOrientationProperty } from './properties/dynamic_orientation_property';
import { StaticTextProperty } from './properties/static_text_property';
import { DynamicTextProperty } from './properties/dynamic_text_property';
import { LabelZoomRangeProperty } from './properties/label_zoom_range_property';
import { LabelBorderSizeProperty } from './properties/label_border_size_property';
import { LabelPositionProperty } from './properties/label_position_property';
import { extractColorFromStyleProperty } from './components/legend/extract_color_from_style_property';
import { SymbolizeAsProperty } from './properties/symbolize_as_property';
import { StaticIconProperty } from './properties/static_icon_property';
import { DynamicIconProperty } from './properties/dynamic_icon_property';
import {
  ColorDynamicOptions,
  ColorStaticOptions,
  ColorStylePropertyDescriptor,
  CustomIcon,
  DynamicStyleProperties,
  DynamicStylePropertyOptions,
  IconDynamicOptions,
  IconStaticOptions,
  IconStylePropertyDescriptor,
  LabelDynamicOptions,
  LabelStaticOptions,
  LabelStylePropertyDescriptor,
  OrientationDynamicOptions,
  OrientationStaticOptions,
  OrientationStylePropertyDescriptor,
  SizeDynamicOptions,
  SizeStaticOptions,
  SizeStylePropertyDescriptor,
  StyleDescriptor,
  StylePropertyField,
  StylePropertyOptions,
  VectorStyleDescriptor,
  VectorStylePropertiesDescriptor,
} from '../../../../common/descriptor_types';
import { IStyle } from '../style';
import { IStyleProperty } from './properties/style_property';
import { IField } from '../../fields/field';
import { IVectorLayer } from '../../layers/vector_layer';
import { IVectorSource } from '../../sources/vector_source';
import { createStyleFieldsHelper, StyleFieldsHelper } from './style_fields_helper';
import { IESAggField } from '../../fields/agg';

export interface IVectorStyle extends IStyle {
  getAllStyleProperties(): Array<IStyleProperty<StylePropertyOptions>>;
  getDynamicPropertiesArray(): Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
  getSourceFieldNames(): string[];
  getStyleMeta(): StyleMeta;

  /*
   * Changes to source descriptor and join descriptor will impact style properties.
   * For instance, a style property may be dynamically tied to the value of an ordinal field defined
   * by a join or a metric aggregation. The metric aggregation or join may be edited or removed.
   * When this happens, the style will be linked to a no-longer-existing field.
   * This method provides a way for a style to clean itself and return a descriptor that unsets any dynamic
   * properties that are tied to missing fields
   *
   * This method does not update its descriptor. It just returns a new descriptor that the caller
   * can then use to update store state via dispatch.
   */
  getDescriptorWithUpdatedStyleProps(
    nextFields: IField[],
    mapColors: string[],
    previousFields?: IField[]
  ): Promise<{ hasChanges: boolean; nextStyleDescriptor?: VectorStyleDescriptor }>;

  getIsPointsOnly(): boolean;
  isTimeAware(): boolean;
  getPropertiesDescriptor(): VectorStylePropertiesDescriptor;
  getPrimaryColor(): string;
  getIcon(showIncompleteIndicator: boolean): ReactElement;
  getIconSvg(symbolId: string): string | undefined;
  isUsingCustomIcon(symbolId: string): boolean;
  hasLegendDetails: () => Promise<boolean>;
  renderLegendDetails: () => ReactElement | null;
  clearFeatureState: (featureCollection: FeatureCollection, mbMap: MbMap, sourceId: string) => void;
  setFeatureStateAndStyleProps: (
    featureCollection: FeatureCollection,
    mbMap: MbMap,
    mbSourceId: string
  ) => boolean;

  /*
   * Returns true when "Label" style configuration is complete and map shows a label for layer features.
   */
  hasLabels: () => boolean;

  arePointsSymbolizedAsCircles: () => boolean;
  setMBPaintProperties: ({
    alpha,
    mbMap,
    fillLayerId,
    lineLayerId,
  }: {
    alpha: unknown;
    mbMap: MbMap;
    fillLayerId: string;
    lineLayerId: string;
  }) => void;
  setMBPaintPropertiesForPoints: ({
    alpha,
    mbMap,
    pointLayerId,
  }: {
    alpha: unknown;
    mbMap: MbMap;
    pointLayerId: string;
  }) => void;
  setMBPropertiesForLabelText: ({
    alpha,
    mbMap,
    textLayerId,
  }: {
    alpha: unknown;
    mbMap: MbMap;
    textLayerId: string;
  }) => void;
  setMBSymbolPropertiesForPoints: ({
    mbMap,
    symbolLayerId,
    alpha,
  }: {
    alpha: unknown;
    mbMap: MbMap;
    symbolLayerId: string;
  }) => void;
}

export class VectorStyle implements IVectorStyle {
  private readonly _descriptor: VectorStyleDescriptor;
  private readonly _layer: IVectorLayer;
  private readonly _customIcons: CustomIcon[];
  private readonly _source: IVectorSource;
  private readonly _styleMeta: StyleMeta;

  private readonly _symbolizeAs: SymbolizeAsProperty;
  private readonly _lineColor: StaticColorProperty | DynamicColorProperty;
  private readonly _fillColor: StaticColorProperty | DynamicColorProperty;
  private readonly _lineWidth: StaticSizeProperty | DynamicSizeProperty;
  private readonly _icon: StaticIconProperty | DynamicIconProperty;
  private readonly _iconSize: StaticSizeProperty | DynamicSizeProperty;
  private readonly _iconOrientation: StaticOrientationProperty | DynamicOrientationProperty;
  private readonly _label: StaticTextProperty | DynamicTextProperty;
  private readonly _labelZoomRange: LabelZoomRangeProperty;
  private readonly _labelSize: StaticSizeProperty | DynamicSizeProperty;
  private readonly _labelColor: StaticColorProperty | DynamicColorProperty;
  private readonly _labelBorderColor: StaticColorProperty | DynamicColorProperty;
  private readonly _labelBorderSize: LabelBorderSizeProperty;
  private readonly _labelPosition: LabelPositionProperty;

  static createDescriptor(
    properties: Partial<VectorStylePropertiesDescriptor> = {},
    isTimeAware = true
  ) {
    return {
      type: LAYER_STYLE_TYPE.VECTOR,
      properties: { ...getDefaultStaticProperties(), ...properties },
      isTimeAware,
    };
  }

  static createDefaultStyleProperties(mapColors: string[]) {
    return getDefaultStaticProperties(mapColors);
  }

  constructor(
    descriptor: VectorStyleDescriptor | null,
    source: IVectorSource,
    layer: IVectorLayer,
    customIcons: CustomIcon[],
    chartsPaletteServiceGetColor?: (value: string) => string | null
  ) {
    this._source = source;
    this._layer = layer;
    this._customIcons = customIcons;
    this._descriptor = descriptor
      ? {
          ...descriptor,
          ...VectorStyle.createDescriptor(descriptor.properties, descriptor.isTimeAware),
        }
      : VectorStyle.createDescriptor();

    this._styleMeta = new StyleMeta(this._descriptor.__styleMeta);

    this._symbolizeAs = new SymbolizeAsProperty(
      this._descriptor.properties[VECTOR_STYLES.SYMBOLIZE_AS].options,
      VECTOR_STYLES.SYMBOLIZE_AS
    );
    this._lineColor = this._makeColorProperty(
      this._descriptor.properties[VECTOR_STYLES.LINE_COLOR],
      VECTOR_STYLES.LINE_COLOR,
      chartsPaletteServiceGetColor
    );
    this._fillColor = this._makeColorProperty(
      this._descriptor.properties[VECTOR_STYLES.FILL_COLOR],
      VECTOR_STYLES.FILL_COLOR,
      chartsPaletteServiceGetColor
    );
    this._lineWidth = this._makeSizeProperty(
      this._descriptor.properties[VECTOR_STYLES.LINE_WIDTH],
      VECTOR_STYLES.LINE_WIDTH,
      this._symbolizeAs.isSymbolizedAsIcon()
    );
    this._icon = this._makeIconProperty(this._descriptor.properties[VECTOR_STYLES.ICON]);
    this._iconSize = this._makeSizeProperty(
      this._descriptor.properties[VECTOR_STYLES.ICON_SIZE],
      VECTOR_STYLES.ICON_SIZE,
      this._symbolizeAs.isSymbolizedAsIcon()
    );
    this._iconOrientation = this._makeOrientationProperty(
      this._descriptor.properties[VECTOR_STYLES.ICON_ORIENTATION],
      VECTOR_STYLES.ICON_ORIENTATION
    );
    this._label = this._makeLabelProperty(this._descriptor.properties[VECTOR_STYLES.LABEL_TEXT]);
    this._labelZoomRange = new LabelZoomRangeProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_ZOOM_RANGE].options,
      VECTOR_STYLES.LABEL_ZOOM_RANGE,
      layer.getMinZoom(),
      layer.getMaxZoom()
    );
    this._labelSize = this._makeSizeProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_SIZE],
      VECTOR_STYLES.LABEL_SIZE,
      this._symbolizeAs.isSymbolizedAsIcon()
    );
    this._labelColor = this._makeColorProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_COLOR],
      VECTOR_STYLES.LABEL_COLOR,
      chartsPaletteServiceGetColor
    );
    this._labelBorderColor = this._makeColorProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_BORDER_COLOR],
      VECTOR_STYLES.LABEL_BORDER_COLOR,
      chartsPaletteServiceGetColor
    );
    this._labelBorderSize = new LabelBorderSizeProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_BORDER_SIZE].options,
      VECTOR_STYLES.LABEL_BORDER_SIZE,
      this._labelSize
    );
    this._labelPosition = new LabelPositionProperty(
      this._descriptor.properties[VECTOR_STYLES.LABEL_POSITION].options,
      VECTOR_STYLES.LABEL_POSITION,
      this._icon,
      this._iconSize,
      this._labelSize,
      this._symbolizeAs.isSymbolizedAsIcon()
    );
  }

  async _updateFieldsInDescriptor(
    nextFields: IField[],
    styleFieldsHelper: StyleFieldsHelper,
    previousFields: IField[],
    mapColors: string[]
  ) {
    const originalProperties = this.getPropertiesDescriptor();
    const invalidStyleNames: VECTOR_STYLES[] = (
      Object.keys(originalProperties) as VECTOR_STYLES[]
    ).filter((key) => {
      const dynamicOptions = getDynamicOptions(originalProperties, key);
      if (!dynamicOptions || !dynamicOptions.field || !dynamicOptions.field.name) {
        return false;
      }

      const hasMatchingField = nextFields.some((field) => {
        return (
          dynamicOptions && dynamicOptions.field && dynamicOptions.field.name === field.getName()
        );
      });
      return !hasMatchingField;
    });

    let hasChanges = false;

    const updatedProperties: VectorStylePropertiesDescriptor = { ...originalProperties };
    invalidStyleNames.forEach((invalidStyleName) => {
      for (let i = 0; i < previousFields.length; i++) {
        const previousField = previousFields[i];
        const nextField = nextFields[i];
        if (previousField.isEqual(nextField)) {
          continue;
        }
        const isFieldDataTypeCompatible = styleFieldsHelper.hasFieldForStyle(
          nextField,
          invalidStyleName
        );
        if (!isFieldDataTypeCompatible) {
          return;
        }
        hasChanges = true;
        (updatedProperties[invalidStyleName] as DynamicStyleProperties) = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            ...originalProperties[invalidStyleName].options,
            field: rectifyFieldDescriptor(nextField as IESAggField, {
              origin: previousField.getOrigin(),
              name: previousField.getName(),
            }),
          } as DynamicStylePropertyOptions,
        };
      }
    });

    return this._deleteFieldsFromDescriptorAndUpdateStyling(
      updatedProperties,
      hasChanges,
      styleFieldsHelper,
      mapColors
    );
  }

  async _deleteFieldsFromDescriptorAndUpdateStyling(
    originalProperties: VectorStylePropertiesDescriptor,
    hasChanges: boolean,
    styleFieldsHelper: StyleFieldsHelper,
    mapColors: string[]
  ) {
    const updatedProperties = {} as VectorStylePropertiesDescriptor;

    const dynamicProperties = (Object.keys(originalProperties) as VECTOR_STYLES[]).filter((key) => {
      const dynamicOptions = getDynamicOptions(originalProperties, key);
      return dynamicOptions && dynamicOptions.field && dynamicOptions.field.name;
    });

    dynamicProperties.forEach((key: VECTOR_STYLES) => {
      // TODO instead of looking up instance by key, update argument originalProperties to be instances instead of descriptors
      const styleProperty = this.getAllStyleProperties().find((property) => {
        return property.getStyleName() === key;
      });
      if (!styleProperty) {
        return;
      }
      const nextStyleFields = styleFieldsHelper
        .getFieldsForStyle(styleProperty, this._layer.getSource().isMvt())
        .filter((styleField) => {
          return !styleField.isUnsupported;
        });

      // Convert dynamic styling to static stying when there are no style fields
      if (nextStyleFields.length === 0) {
        const staticProperties = getDefaultStaticProperties(mapColors);
        updatedProperties[key] = staticProperties[key] as any;
        return;
      }

      const dynamicProperty = originalProperties[key];
      if (!dynamicProperty || !dynamicProperty.options) {
        return;
      }
      const fieldName = (dynamicProperty.options as DynamicStylePropertyOptions).field?.name;
      if (!fieldName) {
        return;
      }

      const fieldStillExists = nextStyleFields.some((nextStyleField) => {
        return fieldName === nextStyleField.name;
      });

      if (fieldStillExists) {
        return;
      }

      updatedProperties[key] = {
        type: DynamicStyleProperty.type,
        options: {
          ...originalProperties[key]!.options,
        },
      } as any;

      if ('field' in updatedProperties[key].options) {
        delete (updatedProperties[key].options as DynamicStylePropertyOptions).field;
      }
    });

    if (Object.keys(updatedProperties).length !== 0) {
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
    } else {
      return {
        hasChanges,
        nextStyleDescriptor: VectorStyle.createDescriptor(
          {
            ...originalProperties,
          },
          this.isTimeAware()
        ),
      };
    }
  }

  async getDescriptorWithUpdatedStyleProps(
    nextFields: IField[],
    mapColors: string[],
    previousFields?: IField[]
  ) {
    const styleFieldsHelper = await createStyleFieldsHelper(nextFields);

    return previousFields && previousFields.length === nextFields.length
      ? // Field-config changed
        await this._updateFieldsInDescriptor(
          nextFields,
          styleFieldsHelper,
          previousFields,
          mapColors
        )
      : // Deletions or additions
        await this._deleteFieldsFromDescriptorAndUpdateStyling(
          this.getPropertiesDescriptor(),
          false,
          styleFieldsHelper,
          mapColors
        );
  }

  getType() {
    return LAYER_STYLE_TYPE.VECTOR;
  }

  getAllStyleProperties(): Array<IStyleProperty<StylePropertyOptions>> {
    return [
      this._symbolizeAs,
      this._icon,
      this._lineColor,
      this._fillColor,
      this._lineWidth,
      this._iconSize,
      this._iconOrientation,
      this._label,
      this._labelZoomRange,
      this._labelSize,
      this._labelColor,
      this._labelBorderColor,
      this._labelBorderSize,
      this._labelPosition,
    ];
  }

  _hasBorder() {
    return this._lineWidth.isDynamic()
      ? this._lineWidth.isComplete()
      : (this._lineWidth as StaticSizeProperty).getOptions().size !== 0;
  }

  renderEditor(
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void,
    onCustomIconsChange: (customIcons: CustomIcon[]) => void
  ) {
    const rawProperties = this.getPropertiesDescriptor();
    const handlePropertyChange = (propertyName: VECTOR_STYLES, stylePropertyDescriptor: any) => {
      rawProperties[propertyName] = stylePropertyDescriptor; // override single property, but preserve the rest
      const vectorStyleDescriptor = VectorStyle.createDescriptor(rawProperties, this.isTimeAware());
      onStyleDescriptorChange(vectorStyleDescriptor);
    };

    const onIsTimeAwareChange = (isTimeAware: boolean) => {
      const vectorStyleDescriptor = VectorStyle.createDescriptor(rawProperties, isTimeAware);
      onStyleDescriptorChange(vectorStyleDescriptor);
    };

    const propertiesWithFieldMeta = this.getDynamicPropertiesArray().filter((dynamicStyleProp) => {
      return dynamicStyleProp.isFieldMetaEnabled();
    });

    const styleProperties: StyleProperties = {};
    this.getAllStyleProperties().forEach((styleProperty) => {
      styleProperties[styleProperty.getStyleName()] = styleProperty;
    });

    return (
      <VectorStyleEditor
        handlePropertyChange={handlePropertyChange}
        styleProperties={styleProperties}
        layer={this._layer}
        isPointsOnly={this.getIsPointsOnly()}
        isLinesOnly={this._getIsLinesOnly()}
        onIsTimeAwareChange={onIsTimeAwareChange}
        onCustomIconsChange={onCustomIconsChange}
        isTimeAware={this.isTimeAware()}
        showIsTimeAware={propertiesWithFieldMeta.length > 0}
        customIcons={this._customIcons}
        hasBorder={this._hasBorder()}
      />
    );
  }

  getSourceFieldNames() {
    const fieldNames: string[] = [];
    this.getDynamicPropertiesArray().forEach((styleProperty) => {
      if (styleProperty.getFieldOrigin() === FIELD_ORIGIN.SOURCE) {
        fieldNames.push(styleProperty.getFieldName());
      }
    });
    return fieldNames;
  }

  isTimeAware() {
    return this._descriptor.isTimeAware;
  }

  getPropertiesDescriptor(): VectorStylePropertiesDescriptor {
    return this._descriptor.properties || {};
  }

  getDynamicPropertiesArray(): Array<IDynamicStyleProperty<DynamicStylePropertyOptions>> {
    const styleProperties = this.getAllStyleProperties();
    return styleProperties.filter(
      (styleProperty) => styleProperty.isDynamic() && styleProperty.isComplete()
    ) as Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
  }

  getIsPointsOnly = () => {
    return this._styleMeta.isPointsOnly();
  };

  _getIsLinesOnly = () => {
    return this._styleMeta.isLinesOnly();
  };

  _getIsPolygonsOnly = () => {
    return this._styleMeta.isPolygonsOnly();
  };

  _getDynamicPropertyByFieldName(fieldName: string) {
    const dynamicProps = this.getDynamicPropertiesArray();
    return dynamicProps.find((dynamicProp) => {
      return fieldName === dynamicProp.getFieldName();
    });
  }

  getStyleMeta() {
    return this._styleMeta;
  }

  _getFieldFormatter = (fieldName: string) => {
    const dynamicProp = this._getDynamicPropertyByFieldName(fieldName);
    if (!dynamicProp) {
      return null;
    }

    let dataRequestId;
    if (dynamicProp.getFieldOrigin() === FIELD_ORIGIN.SOURCE) {
      dataRequestId = SOURCE_FORMATTERS_DATA_REQUEST_ID;
    } else {
      const targetJoin = this._layer.getValidJoins().find((join) => {
        return !!join.getRightJoinSource().getFieldByName(fieldName);
      });
      if (targetJoin) {
        dataRequestId = targetJoin.getSourceFormattersDataRequestId();
      }
    }

    if (!dataRequestId) {
      return null;
    }

    const formattersDataRequest = this._layer.getDataRequest(dataRequestId);
    if (!formattersDataRequest || !formattersDataRequest.hasData()) {
      return null;
    }

    const formatters = formattersDataRequest.getData();
    // @ts-expect-error
    return formatters ? formatters[fieldName] : null;
  };

  getIconSvg(symbolId: string) {
    const meta = this._getIconMeta(symbolId);
    return meta ? meta.svg : undefined;
  }

  _getSymbolId() {
    return this.arePointsSymbolizedAsCircles() || this._icon.isDynamic()
      ? undefined
      : (this._icon as StaticIconProperty).getOptions().value;
  }

  _getIconMeta(
    symbolId: string
  ): { svg: string; label: string; iconSource: ICON_SOURCE } | undefined {
    const icon = this._customIcons.find(({ symbolId: value }) => value === symbolId);
    if (icon) {
      return { ...icon, iconSource: ICON_SOURCE.CUSTOM };
    }
    const symbol = getMakiSymbol(symbolId);
    return symbol ? { ...symbol, iconSource: ICON_SOURCE.MAKI } : undefined;
  }

  getPrimaryColor() {
    const primaryColorKey = this._getIsLinesOnly()
      ? VECTOR_STYLES.LINE_COLOR
      : VECTOR_STYLES.FILL_COLOR;
    return extractColorFromStyleProperty(this._descriptor.properties[primaryColorKey], 'grey');
  }

  getIcon(showIncompleteIndicator: boolean) {
    const isLinesOnly = this._getIsLinesOnly();
    const isPointsOnly = this.getIsPointsOnly();

    let strokeColor;
    if (isLinesOnly) {
      strokeColor = extractColorFromStyleProperty(
        this._descriptor.properties[VECTOR_STYLES.LINE_COLOR],
        'grey'
      );
    } else if (this._hasBorder()) {
      strokeColor = extractColorFromStyleProperty(
        this._descriptor.properties[VECTOR_STYLES.LINE_COLOR],
        'none'
      );
    }
    const fillColor = isLinesOnly
      ? undefined
      : extractColorFromStyleProperty(
          this._descriptor.properties[VECTOR_STYLES.FILL_COLOR],
          'grey'
        );

    const borderStyle: CSSProperties = showIncompleteIndicator
      ? {
          borderColor: this.getPrimaryColor(),
          borderStyle: 'dashed',
          borderWidth: '1px',
        }
      : {};

    const symbolId = this._getSymbolId();
    const svg = symbolId ? this.getIconSvg(symbolId) : undefined;

    return (
      <VectorIcon
        borderStyle={borderStyle}
        isPointsOnly={isPointsOnly}
        isLinesOnly={isLinesOnly}
        strokeColor={strokeColor}
        fillColor={fillColor}
        symbolId={symbolId}
        svg={svg}
      />
    );
  }

  isUsingCustomIcon(symbolId: string) {
    if (this._icon.isDynamic()) {
      const { customIconStops } = this._icon.getOptions() as IconDynamicOptions;
      return customIconStops ? customIconStops.some(({ icon }) => icon === symbolId) : false;
    }
    const { value } = this._icon.getOptions() as IconStaticOptions;
    return value === symbolId;
  }

  _getLegendDetailStyleProperties = () => {
    const hasLabels = this.hasLabels();
    return this.getDynamicPropertiesArray().filter((styleProperty) => {
      const styleName = styleProperty.getStyleName();
      if ([VECTOR_STYLES.ICON_ORIENTATION, VECTOR_STYLES.LABEL_TEXT].includes(styleName)) {
        return false;
      }

      if (!hasLabels && LABEL_STYLES.includes(styleName)) {
        // do not render legend for label styles when there is no label
        return false;
      }

      if (this._getIsLinesOnly()) {
        return LINE_STYLES.includes(styleName);
      }

      if (this._getIsPolygonsOnly()) {
        return POLYGON_STYLES.includes(styleName);
      }

      return true;
    });
  };

  async hasLegendDetails() {
    return this._source.hasLegendDetails && this._source.renderLegendDetails
      ? await this._source.hasLegendDetails()
      : this._getLegendDetailStyleProperties().length > 0;
  }

  renderLegendDetails() {
    const symbolId = this._getSymbolId();
    const svg = symbolId ? this.getIconSvg(symbolId) : undefined;

    return this._source.renderLegendDetails ? (
      this._source.renderLegendDetails(this)
    ) : (
      <VectorStyleLegend
        masks={this._layer.getMasks()}
        styles={this._getLegendDetailStyleProperties()}
        isPointsOnly={this.getIsPointsOnly()}
        isLinesOnly={this._getIsLinesOnly()}
        symbolId={symbolId}
        svg={svg}
      />
    );
  }

  clearFeatureState(featureCollection: FeatureCollection, mbMap: MbMap, sourceId: string) {
    const tmpFeatureIdentifier: FeatureIdentifier = {
      source: '',
      id: undefined,
    };
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];
      tmpFeatureIdentifier.source = sourceId;
      tmpFeatureIdentifier.id = feature.id;
      mbMap.removeFeatureState(tmpFeatureIdentifier);
    }
  }

  setFeatureStateAndStyleProps(
    featureCollection: FeatureCollection,
    mbMap: MbMap,
    mbSourceId: string
  ): boolean {
    if (!featureCollection) {
      return false;
    }

    const dynamicStyleProps = this.getDynamicPropertiesArray();
    if (dynamicStyleProps.length === 0) {
      return false;
    }

    let shouldResetAllData = false;
    for (let j = 0; j < dynamicStyleProps.length; j++) {
      const dynamicStyleProp = dynamicStyleProps[j];
      const usedFeatureState = dynamicStyleProp.enrichGeoJsonAndMbFeatureState(
        featureCollection,
        mbMap,
        mbSourceId
      );
      if (!usedFeatureState) {
        shouldResetAllData = true;
      }
    }

    // returns boolean indicating if styles do not support feature-state and some values are stored in geojson properties
    // this return-value is used in an optimization for style-updates with mapbox-gl.
    // `true` indicates the entire data needs to reset on the source (otherwise the style-rules will not be reapplied)
    // `false` indicates the data does not need to be reset on the store, because styles are re-evaluated if they use featureState
    return shouldResetAllData;
  }

  arePointsSymbolizedAsCircles() {
    return !this._symbolizeAs.isSymbolizedAsIcon();
  }

  hasLabels() {
    return getHasLabel(this._label);
  }

  setMBPaintProperties({
    alpha,
    mbMap,
    fillLayerId,
    lineLayerId,
  }: {
    alpha: unknown;
    mbMap: MbMap;
    fillLayerId: string;
    lineLayerId: string;
  }) {
    this._fillColor.syncFillColorWithMb(fillLayerId, mbMap, alpha);
    this._lineColor.syncLineColorWithMb(lineLayerId, mbMap, alpha);
    this._lineWidth.syncLineWidthWithMb(lineLayerId, mbMap);
  }

  setMBPaintPropertiesForPoints({
    alpha,
    mbMap,
    pointLayerId,
  }: {
    alpha: unknown;
    mbMap: MbMap;
    pointLayerId: string;
  }) {
    this._fillColor.syncCircleColorWithMb(pointLayerId, mbMap, alpha);
    this._lineColor.syncCircleStrokeWithMb(pointLayerId, mbMap, alpha);
    const hasNoRadius =
      !this._iconSize.isDynamic() && (this._iconSize as StaticSizeProperty).getOptions().size === 0;
    this._lineWidth.syncCircleStrokeWidthWithMb(pointLayerId, mbMap, hasNoRadius);
    this._iconSize.syncCircleRadiusWithMb(pointLayerId, mbMap);
  }

  setMBPropertiesForLabelText({
    alpha,
    mbMap,
    textLayerId,
  }: {
    alpha: unknown;
    mbMap: MbMap;
    textLayerId: string;
  }) {
    this._label.syncTextFieldWithMb(textLayerId, mbMap);
    this._labelZoomRange.syncLabelZoomRange(textLayerId, mbMap);
    this._labelColor.syncLabelColorWithMb(textLayerId, mbMap, alpha);
    this._labelSize.syncLabelSizeWithMb(textLayerId, mbMap);
    this._labelBorderSize.syncLabelBorderSizeWithMb(textLayerId, mbMap);
    this._labelPosition.syncLabelPositionWithMb(textLayerId, mbMap);
    this._labelBorderColor.syncLabelBorderColorWithMb(textLayerId, mbMap);
  }

  setMBSymbolPropertiesForPoints({
    mbMap,
    symbolLayerId,
    alpha,
  }: {
    alpha: unknown;
    mbMap: MbMap;
    symbolLayerId: string;
  }) {
    mbMap.setLayoutProperty(symbolLayerId, 'icon-ignore-placement', true);
    mbMap.setPaintProperty(symbolLayerId, 'icon-opacity', alpha);
    mbMap.setLayoutProperty(symbolLayerId, 'icon-allow-overlap', true);

    this._icon.syncIconWithMb(symbolLayerId, mbMap);
    // icon-color is only supported on SDF icons.
    this._fillColor.syncIconColorWithMb(symbolLayerId, mbMap);
    this._lineColor.syncHaloBorderColorWithMb(symbolLayerId, mbMap);
    this._lineWidth.syncHaloWidthWithMb(symbolLayerId, mbMap);
    this._iconSize.syncIconSizeWithMb(symbolLayerId, mbMap);
    this._iconOrientation.syncIconRotationWithMb(symbolLayerId, mbMap);
  }

  _makeField(fieldDescriptor?: StylePropertyField): IField | null {
    if (!fieldDescriptor || !fieldDescriptor.name) {
      return null;
    }

    // fieldDescriptor.label is ignored. This is essentially cruft duplicating label-info from the metric-selection
    // Ignore this custom label
    if (fieldDescriptor.origin === FIELD_ORIGIN.SOURCE) {
      return this._source.getFieldByName(fieldDescriptor.name);
    } else if (fieldDescriptor.origin === FIELD_ORIGIN.JOIN) {
      const targetJoin = this._layer.getValidJoins().find((join) => {
        return !!join.getRightJoinSource().getFieldByName(fieldDescriptor.name);
      });
      return targetJoin
        ? targetJoin.getRightJoinSource().getFieldByName(fieldDescriptor.name)
        : null;
    } else {
      throw new Error(`Unknown origin-type ${fieldDescriptor.origin}`);
    }
  }

  _makeSizeProperty(
    descriptor: SizeStylePropertyDescriptor | undefined,
    styleName: VECTOR_STYLES,
    isSymbolizedAsIcon: boolean
  ) {
    if (!descriptor || !descriptor.options) {
      return new StaticSizeProperty({ size: 0 }, styleName);
    } else if (descriptor.type === StaticStyleProperty.type) {
      return new StaticSizeProperty(descriptor.options as SizeStaticOptions, styleName);
    } else if (descriptor.type === DynamicStyleProperty.type) {
      const options = descriptor.options as SizeDynamicOptions;
      const field = this._makeField(options.field);
      return new DynamicSizeProperty(
        options,
        styleName,
        field,
        this._layer,
        this._getFieldFormatter,
        isSymbolizedAsIcon
      );
    } else {
      throw new Error(`${descriptor} not implemented`);
    }
  }

  _makeColorProperty(
    descriptor: ColorStylePropertyDescriptor | undefined,
    styleName: VECTOR_STYLES,
    chartsPaletteServiceGetColor?: (value: string) => string | null
  ) {
    if (!descriptor || !descriptor.options) {
      return new StaticColorProperty({ color: '' }, styleName);
    } else if (descriptor.type === StaticStyleProperty.type) {
      return new StaticColorProperty(descriptor.options as ColorStaticOptions, styleName);
    } else if (descriptor.type === DynamicStyleProperty.type) {
      const options = descriptor.options as ColorDynamicOptions;
      const field = this._makeField(options.field);
      return new DynamicColorProperty(
        options,
        styleName,
        field,
        this._layer,
        this._getFieldFormatter,
        chartsPaletteServiceGetColor
      );
    } else {
      throw new Error(`${descriptor} not implemented`);
    }
  }

  _makeOrientationProperty(
    descriptor: OrientationStylePropertyDescriptor | undefined,
    styleName: VECTOR_STYLES
  ) {
    if (!descriptor || !descriptor.options) {
      return new StaticOrientationProperty({ orientation: 0 }, styleName);
    } else if (descriptor.type === StaticStyleProperty.type) {
      return new StaticOrientationProperty(
        descriptor.options as OrientationStaticOptions,
        styleName
      );
    } else if (descriptor.type === DynamicStyleProperty.type) {
      const options = descriptor.options as OrientationDynamicOptions;
      const field = this._makeField(options.field);
      return new DynamicOrientationProperty(
        options,
        styleName,
        field,
        this._layer,
        this._getFieldFormatter
      );
    } else {
      throw new Error(`${descriptor} not implemented`);
    }
  }

  _makeLabelProperty(descriptor?: LabelStylePropertyDescriptor) {
    if (!descriptor || !descriptor.options) {
      return new StaticTextProperty({ value: '' }, VECTOR_STYLES.LABEL_TEXT);
    } else if (descriptor.type === StaticStyleProperty.type) {
      return new StaticTextProperty(
        descriptor.options as LabelStaticOptions,
        VECTOR_STYLES.LABEL_TEXT
      );
    } else if (descriptor.type === DynamicStyleProperty.type) {
      const options = descriptor.options as LabelDynamicOptions;
      const field = this._makeField(options.field);
      return new DynamicTextProperty(
        options,
        VECTOR_STYLES.LABEL_TEXT,
        field,
        this._layer,
        this._getFieldFormatter
      );
    } else {
      throw new Error(`${descriptor} not implemented`);
    }
  }

  _makeIconProperty(descriptor?: IconStylePropertyDescriptor) {
    if (!descriptor || !descriptor.options) {
      return new StaticIconProperty({ value: DEFAULT_ICON }, VECTOR_STYLES.ICON);
    } else if (descriptor.type === StaticStyleProperty.type) {
      const { value } = { ...descriptor.options } as IconStaticOptions;
      const meta = this._getIconMeta(value);
      let svg;
      let label;
      let iconSource;
      if (meta) {
        ({ svg, label, iconSource } = meta);
      }
      return new StaticIconProperty(
        { value, svg, label, iconSource } as IconStaticOptions,
        VECTOR_STYLES.ICON
      );
    } else if (descriptor.type === DynamicStyleProperty.type) {
      const options = { ...descriptor.options } as IconDynamicOptions;
      if (options.customIconStops) {
        options.customIconStops.forEach((iconStop) => {
          const meta = this._getIconMeta(iconStop.icon);
          if (meta) {
            iconStop.iconSource = meta.iconSource;
          }
        });
      }
      const field = this._makeField(options.field);
      return new DynamicIconProperty(
        options,
        VECTOR_STYLES.ICON,
        field,
        this._layer,
        this._getFieldFormatter
      );
    } else {
      throw new Error(`${descriptor} not implemented`);
    }
  }
}

function getDynamicOptions(
  originalProperties: VectorStylePropertiesDescriptor,
  key: VECTOR_STYLES
): DynamicStylePropertyOptions | null {
  if (!originalProperties[key]) {
    return null;
  }
  const propertyDescriptor = originalProperties[key];
  if (
    !propertyDescriptor ||
    !('type' in propertyDescriptor) ||
    propertyDescriptor.type !== STYLE_TYPE.DYNAMIC ||
    !propertyDescriptor.options
  ) {
    return null;
  }
  return propertyDescriptor.options as DynamicStylePropertyOptions;
}

function rectifyFieldDescriptor(
  currentField: IESAggField,
  previousFieldDescriptor: StylePropertyField
): StylePropertyField {
  return {
    origin: previousFieldDescriptor.origin,
    name: currentField.getName(),
  };
}
