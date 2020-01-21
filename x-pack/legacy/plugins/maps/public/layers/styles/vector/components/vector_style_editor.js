/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component, Fragment } from 'react';

import chrome from 'ui/chrome';
import { VectorStyleColorEditor } from './color/vector_style_color_editor';
import { VectorStyleSizeEditor } from './size/vector_style_size_editor';
import { VectorStyleSymbolEditor } from './vector_style_symbol_editor';
import { VectorStyleLabelEditor } from './label/vector_style_label_editor';
import { VectorStyleLabelBorderSizeEditor } from './label/vector_style_label_border_size_editor';
import { VectorStyle } from '../vector_style';
import { OrientationEditor } from './orientation/orientation_editor';
import {
  getDefaultDynamicProperties,
  getDefaultStaticProperties,
  VECTOR_STYLES,
} from '../vector_style_defaults';
import { DEFAULT_FILL_COLORS, DEFAULT_LINE_COLORS } from '../../color_utils';
import { VECTOR_SHAPE_TYPES } from '../../../sources/vector_feature_types';
import { SYMBOLIZE_AS_ICON } from '../vector_constants';
import { i18n } from '@kbn/i18n';
import { SYMBOL_OPTIONS } from '../symbol_utils';

import { EuiSpacer, EuiButtonGroup, EuiFormRow, EuiSwitch } from '@elastic/eui';

export class VectorStyleEditor extends Component {
  state = {
    dateFields: [],
    numberFields: [],
    categoricalFields: [],
    fields: [],
    defaultDynamicProperties: getDefaultDynamicProperties(),
    defaultStaticProperties: getDefaultStaticProperties(),
    supportedFeatures: undefined,
    selectedFeatureType: undefined,
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadFields();
    this._loadSupportedFeatures();
  }

  componentDidUpdate() {
    this._loadFields();
    this._loadSupportedFeatures();
  }

  async _loadFields() {
    const getFieldMeta = async field => {
      return {
        label: await field.getLabel(),
        name: field.getName(),
        origin: field.getOrigin(),
      };
    };

    const dateFields = await this.props.layer.getDateFields();
    const dateFieldPromises = dateFields.map(getFieldMeta);
    const dateFieldsArray = await Promise.all(dateFieldPromises);
    if (this._isMounted && !_.isEqual(dateFieldsArray, this.state.dateFields)) {
      this.setState({ dateFields: dateFieldsArray });
    }

    const numberFields = await this.props.layer.getNumberFields();
    const numberFieldPromises = numberFields.map(getFieldMeta);
    const numberFieldsArray = await Promise.all(numberFieldPromises);
    if (this._isMounted && !_.isEqual(numberFieldsArray, this.state.numberFields)) {
      this.setState({ numberFields: numberFieldsArray });
    }

    const categoricalFields = await this.props.layer.getCategoricalFields();
    const categoricalFieldMeta = categoricalFields.map(getFieldMeta);
    const categoricalFieldsArray = await Promise.all(categoricalFieldMeta);
    if (this._isMounted && !_.isEqual(categoricalFieldsArray, this.state.categoricalFields)) {
      this.setState({ categoricalFields: categoricalFieldsArray });
    }

    const fields = await this.props.layer.getFields();
    const fieldPromises = fields.map(getFieldMeta);
    const fieldsArray = await Promise.all(fieldPromises);
    if (this._isMounted && !_.isEqual(fieldsArray, this.state.fields)) {
      this.setState({ fields: fieldsArray });
    }
  }

  async _loadSupportedFeatures() {
    const supportedFeatures = await this.props.layer.getSource().getSupportedShapeTypes();
    if (!this._isMounted) {
      return;
    }

    let selectedFeature = VECTOR_SHAPE_TYPES.POLYGON;
    if (this.props.isPointsOnly) {
      selectedFeature = VECTOR_SHAPE_TYPES.POINT;
    } else if (this.props.isLinesOnly) {
      selectedFeature = VECTOR_SHAPE_TYPES.LINE;
    }

    if (
      !_.isEqual(supportedFeatures, this.state.supportedFeatures) ||
      selectedFeature !== this.state.selectedFeature
    ) {
      this.setState({ supportedFeatures, selectedFeature });
    }
  }

  _getOrdinalFields() {
    return [...this.state.dateFields, ...this.state.numberFields];
  }

  _getOrdinalAndCategoricalFields() {
    return [...this.state.dateFields, ...this.state.numberFields, ...this.state.categoricalFields];
  }

  _handleSelectedFeatureChange = selectedFeature => {
    this.setState({ selectedFeature });
  };

  _onIsTimeAwareChange = event => {
    this.props.onIsTimeAwareChange(event.target.checked);
  };

  _onStaticStyleChange = (propertyName, options) => {
    const styleDescriptor = {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options,
    };
    this.props.handlePropertyChange(propertyName, styleDescriptor);
  };

  _onDynamicStyleChange = (propertyName, options) => {
    const styleDescriptor = {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options,
    };
    this.props.handlePropertyChange(propertyName, styleDescriptor);
  };

  _renderFillColor() {
    return (
      <VectorStyleColorEditor
        swatches={DEFAULT_FILL_COLORS}
        onStaticStyleChange={this._onStaticStyleChange}
        onDynamicStyleChange={this._onDynamicStyleChange}
        styleProperty={this.props.styleProperties[VECTOR_STYLES.FILL_COLOR]}
        fields={this._getOrdinalAndCategoricalFields()}
        defaultStaticStyleOptions={
          this.state.defaultStaticProperties[VECTOR_STYLES.FILL_COLOR].options
        }
        defaultDynamicStyleOptions={
          this.state.defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR].options
        }
      />
    );
  }

  _renderLineColor() {
    return (
      <VectorStyleColorEditor
        swatches={DEFAULT_LINE_COLORS}
        onStaticStyleChange={this._onStaticStyleChange}
        onDynamicStyleChange={this._onDynamicStyleChange}
        styleProperty={this.props.styleProperties[VECTOR_STYLES.LINE_COLOR]}
        fields={this._getOrdinalAndCategoricalFields()}
        defaultStaticStyleOptions={
          this.state.defaultStaticProperties[VECTOR_STYLES.LINE_COLOR].options
        }
        defaultDynamicStyleOptions={
          this.state.defaultDynamicProperties[VECTOR_STYLES.LINE_COLOR].options
        }
      />
    );
  }

  _renderLineWidth() {
    return (
      <VectorStyleSizeEditor
        onStaticStyleChange={this._onStaticStyleChange}
        onDynamicStyleChange={this._onDynamicStyleChange}
        styleProperty={this.props.styleProperties[VECTOR_STYLES.LINE_WIDTH]}
        fields={this._getOrdinalFields()}
        defaultStaticStyleOptions={
          this.state.defaultStaticProperties[VECTOR_STYLES.LINE_WIDTH].options
        }
        defaultDynamicStyleOptions={
          this.state.defaultDynamicProperties[VECTOR_STYLES.LINE_WIDTH].options
        }
      />
    );
  }

  _renderSymbolSize() {
    return (
      <VectorStyleSizeEditor
        onStaticStyleChange={this._onStaticStyleChange}
        onDynamicStyleChange={this._onDynamicStyleChange}
        styleProperty={this.props.styleProperties[VECTOR_STYLES.ICON_SIZE]}
        fields={this._getOrdinalFields()}
        defaultStaticStyleOptions={
          this.state.defaultStaticProperties[VECTOR_STYLES.ICON_SIZE].options
        }
        defaultDynamicStyleOptions={
          this.state.defaultDynamicProperties[VECTOR_STYLES.ICON_SIZE].options
        }
      />
    );
  }

  _renderLabelProperties() {
    return (
      <Fragment>
        <VectorStyleLabelEditor
          onStaticStyleChange={this._onStaticStyleChange}
          onDynamicStyleChange={this._onDynamicStyleChange}
          styleProperty={this.props.styleProperties[VECTOR_STYLES.LABEL_TEXT]}
          fields={this.state.fields}
          defaultStaticStyleOptions={
            this.state.defaultStaticProperties[VECTOR_STYLES.LABEL_TEXT].options
          }
          defaultDynamicStyleOptions={
            this.state.defaultDynamicProperties[VECTOR_STYLES.LABEL_TEXT].options
          }
        />
        <EuiSpacer size="m" />

        <VectorStyleColorEditor
          swatches={DEFAULT_LINE_COLORS}
          onStaticStyleChange={this._onStaticStyleChange}
          onDynamicStyleChange={this._onDynamicStyleChange}
          styleProperty={this.props.styleProperties[VECTOR_STYLES.LABEL_COLOR]}
          fields={this._getOrdinalAndCategoricalFields()}
          defaultStaticStyleOptions={
            this.state.defaultStaticProperties[VECTOR_STYLES.LABEL_COLOR].options
          }
          defaultDynamicStyleOptions={
            this.state.defaultDynamicProperties[VECTOR_STYLES.LABEL_COLOR].options
          }
        />
        <EuiSpacer size="m" />

        <VectorStyleSizeEditor
          onStaticStyleChange={this._onStaticStyleChange}
          onDynamicStyleChange={this._onDynamicStyleChange}
          styleProperty={this.props.styleProperties[VECTOR_STYLES.LABEL_SIZE]}
          fields={this._getOrdinalFields()}
          defaultStaticStyleOptions={
            this.state.defaultStaticProperties[VECTOR_STYLES.LABEL_SIZE].options
          }
          defaultDynamicStyleOptions={
            this.state.defaultDynamicProperties[VECTOR_STYLES.LABEL_SIZE].options
          }
        />
        <EuiSpacer size="m" />

        <VectorStyleColorEditor
          swatches={DEFAULT_LINE_COLORS}
          onStaticStyleChange={this._onStaticStyleChange}
          onDynamicStyleChange={this._onDynamicStyleChange}
          styleProperty={this.props.styleProperties[VECTOR_STYLES.LABEL_BORDER_COLOR]}
          fields={this._getOrdinalAndCategoricalFields()}
          defaultStaticStyleOptions={
            this.state.defaultStaticProperties[VECTOR_STYLES.LABEL_BORDER_COLOR].options
          }
          defaultDynamicStyleOptions={
            this.state.defaultDynamicProperties[VECTOR_STYLES.LABEL_BORDER_COLOR].options
          }
        />
        <EuiSpacer size="m" />

        <VectorStyleLabelBorderSizeEditor
          handlePropertyChange={this.props.handlePropertyChange}
          styleProperty={this.props.styleProperties[VECTOR_STYLES.LABEL_BORDER_SIZE]}
        />
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  _renderPointProperties() {
    let iconOrientation;
    if (this.props.symbolDescriptor.options.symbolizeAs === SYMBOLIZE_AS_ICON) {
      iconOrientation = (
        <OrientationEditor
          onStaticStyleChange={this._onStaticStyleChange}
          onDynamicStyleChange={this._onDynamicStyleChange}
          styleProperty={this.props.styleProperties[VECTOR_STYLES.ICON_ORIENTATION]}
          fields={this.state.numberFields}
          defaultStaticStyleOptions={
            this.state.defaultStaticProperties[VECTOR_STYLES.ICON_ORIENTATION].options
          }
          defaultDynamicStyleOptions={
            this.state.defaultDynamicProperties[VECTOR_STYLES.ICON_ORIENTATION].options
          }
        />
      );
    }

    return (
      <Fragment>
        <VectorStyleSymbolEditor
          styleOptions={this.props.symbolDescriptor.options}
          handlePropertyChange={this.props.handlePropertyChange}
          symbolOptions={SYMBOL_OPTIONS}
          isDarkMode={chrome.getUiSettingsClient().get('theme:darkMode', false)}
        />
        <EuiSpacer size="m" />

        {this._renderFillColor()}
        <EuiSpacer size="m" />

        {this._renderLineColor()}
        <EuiSpacer size="m" />

        {this._renderLineWidth()}
        <EuiSpacer size="m" />

        {iconOrientation}
        <EuiSpacer size="m" />

        {this._renderSymbolSize()}
        <EuiSpacer size="m" />

        {this._renderLabelProperties()}
      </Fragment>
    );
  }

  _renderLineProperties() {
    return (
      <Fragment>
        {this._renderLineColor()}
        <EuiSpacer size="m" />

        {this._renderLineWidth()}
      </Fragment>
    );
  }

  _renderPolygonProperties() {
    return (
      <Fragment>
        {this._renderFillColor()}
        <EuiSpacer size="m" />

        {this._renderLineColor()}
        <EuiSpacer size="m" />

        {this._renderLineWidth()}
      </Fragment>
    );
  }

  _renderProperties() {
    const { supportedFeatures, selectedFeature } = this.state;

    if (!supportedFeatures) {
      return null;
    }

    if (supportedFeatures.length === 1) {
      switch (supportedFeatures[0]) {
        case VECTOR_SHAPE_TYPES.POINT:
          return this._renderPointProperties();
        case VECTOR_SHAPE_TYPES.LINE:
          return this._renderLineProperties();
        case VECTOR_SHAPE_TYPES.POLYGON:
          return this._renderPolygonProperties();
      }
    }

    const featureButtons = [
      {
        id: VECTOR_SHAPE_TYPES.POINT,
        label: i18n.translate('xpack.maps.vectorStyleEditor.pointLabel', {
          defaultMessage: 'Points',
        }),
      },
      {
        id: VECTOR_SHAPE_TYPES.LINE,
        label: i18n.translate('xpack.maps.vectorStyleEditor.lineLabel', {
          defaultMessage: 'Lines',
        }),
      },
      {
        id: VECTOR_SHAPE_TYPES.POLYGON,
        label: i18n.translate('xpack.maps.vectorStyleEditor.polygonLabel', {
          defaultMessage: 'Polygons',
        }),
      },
    ];

    let styleProperties = this._renderPolygonProperties();
    if (selectedFeature === VECTOR_SHAPE_TYPES.LINE) {
      styleProperties = this._renderLineProperties();
    } else if (selectedFeature === VECTOR_SHAPE_TYPES.POINT) {
      styleProperties = this._renderPointProperties();
    }

    return (
      <Fragment>
        <EuiButtonGroup
          legend={i18n.translate('xpack.maps.vectorStyleEditor.featureTypeButtonGroupLegend', {
            defaultMessage: 'vector feature button group',
          })}
          options={featureButtons}
          idSelected={selectedFeature}
          onChange={this._handleSelectedFeatureChange}
        />

        <EuiSpacer size="m" />

        {styleProperties}
      </Fragment>
    );
  }

  _renderIsTimeAwareSwitch() {
    if (!this.props.showIsTimeAware) {
      return null;
    }

    return (
      <EuiFormRow display="columnCompressedSwitch">
        <EuiSwitch
          label={i18n.translate('xpack.maps.vectorStyleEditor.isTimeAwareLabel', {
            defaultMessage: 'Apply global time to style metadata requests',
          })}
          checked={this.props.isTimeAware}
          onChange={this._onIsTimeAwareChange}
          compressed
        />
      </EuiFormRow>
    );
  }

  render() {
    return (
      <Fragment>
        {this._renderProperties()}
        {this._renderIsTimeAwareSwitch()}
      </Fragment>
    );
  }
}
