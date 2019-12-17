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
import { OrientationEditor } from './orientation/orientation_editor';
import { getDefaultDynamicProperties, getDefaultStaticProperties } from '../vector_style_defaults';
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

    const fields = await this.props.layer.getFields();
    const fieldPromises = fields.map(getFieldMeta);
    const fieldsArray = await Promise.all(fieldPromises);
    if (this._isMounted && !_.isEqual(fieldsArray, this.state.fields)) {
      this.setState({ fields: fieldsArray });
    }
  }

  async _loadSupportedFeatures() {
    const supportedFeatures = await this.props.layer.getSource().getSupportedShapeTypes();
    const isPointsOnly = await this.props.loadIsPointsOnly();
    const isLinesOnly = await this.props.loadIsLinesOnly();

    if (!this._isMounted) {
      return;
    }

    if (
      _.isEqual(supportedFeatures, this.state.supportedFeatures) &&
      isPointsOnly === this.state.isPointsOnly &&
      isLinesOnly === this.state.isLinesOnly
    ) {
      return;
    }

    let selectedFeature = VECTOR_SHAPE_TYPES.POLYGON;
    if (isPointsOnly) {
      selectedFeature = VECTOR_SHAPE_TYPES.POINT;
    } else if (isLinesOnly) {
      selectedFeature = VECTOR_SHAPE_TYPES.LINE;
    }

    if (
      !_.isEqual(supportedFeatures, this.state.supportedFeatures) ||
      selectedFeature !== this.state.selectedFeature
    ) {
      this.setState({
        supportedFeatures,
        selectedFeature,
        isPointsOnly,
        isLinesOnly,
      });
    }
  }

  _getOrdinalFields() {
    return [...this.state.dateFields, ...this.state.numberFields];
  }

  _handleSelectedFeatureChange = selectedFeature => {
    this.setState({ selectedFeature });
  };

  _onIsTimeAwareChange = event => {
    this.props.onIsTimeAwareChange(event.target.checked);
  };

  _renderFillColor() {
    return (
      <VectorStyleColorEditor
        swatches={DEFAULT_FILL_COLORS}
        handlePropertyChange={this.props.handlePropertyChange}
        styleProperty={this.props.styleProperties.fillColor}
        fields={this._getOrdinalFields()}
        defaultStaticStyleOptions={this.state.defaultStaticProperties.fillColor.options}
        defaultDynamicStyleOptions={this.state.defaultDynamicProperties.fillColor.options}
      />
    );
  }

  _renderLineColor() {
    return (
      <VectorStyleColorEditor
        swatches={DEFAULT_LINE_COLORS}
        handlePropertyChange={this.props.handlePropertyChange}
        styleProperty={this.props.styleProperties.lineColor}
        fields={this._getOrdinalFields()}
        defaultStaticStyleOptions={this.state.defaultStaticProperties.lineColor.options}
        defaultDynamicStyleOptions={this.state.defaultDynamicProperties.lineColor.options}
      />
    );
  }

  _renderLineWidth() {
    return (
      <VectorStyleSizeEditor
        handlePropertyChange={this.props.handlePropertyChange}
        styleProperty={this.props.styleProperties.lineWidth}
        fields={this._getOrdinalFields()}
        defaultStaticStyleOptions={this.state.defaultStaticProperties.lineWidth.options}
        defaultDynamicStyleOptions={this.state.defaultDynamicProperties.lineWidth.options}
      />
    );
  }

  _renderSymbolSize() {
    return (
      <VectorStyleSizeEditor
        handlePropertyChange={this.props.handlePropertyChange}
        styleProperty={this.props.styleProperties.iconSize}
        fields={this._getOrdinalFields()}
        defaultStaticStyleOptions={this.state.defaultStaticProperties.iconSize.options}
        defaultDynamicStyleOptions={this.state.defaultDynamicProperties.iconSize.options}
      />
    );
  }

  _renderLabelProperties() {
    const labelEditor = (
      <VectorStyleLabelEditor
        handlePropertyChange={this.props.handlePropertyChange}
        styleProperty={this.props.styleProperties.labelText}
        fields={this.state.fields}
        defaultStaticStyleOptions={this.state.defaultStaticProperties.labelText.options}
        defaultDynamicStyleOptions={this.state.defaultDynamicProperties.labelText.options}
      />
    );

    if (!this.props.styleProperties.labelText.isComplete()) {
      return (
        <Fragment>
          {labelEditor}
          <EuiSpacer size="m" />
        </Fragment>
      );
    }

    return (
      <Fragment>
        {labelEditor}
        <EuiSpacer size="m" />

        <VectorStyleColorEditor
          swatches={DEFAULT_LINE_COLORS}
          handlePropertyChange={this.props.handlePropertyChange}
          styleProperty={this.props.styleProperties.labelColor}
          fields={this._getOrdinalFields()}
          defaultStaticStyleOptions={this.state.defaultStaticProperties.labelColor.options}
          defaultDynamicStyleOptions={this.state.defaultDynamicProperties.labelColor.options}
        />
        <EuiSpacer size="m" />

        <VectorStyleSizeEditor
          handlePropertyChange={this.props.handlePropertyChange}
          styleProperty={this.props.styleProperties.labelSize}
          fields={this._getOrdinalFields()}
          defaultStaticStyleOptions={this.state.defaultStaticProperties.labelSize.options}
          defaultDynamicStyleOptions={this.state.defaultDynamicProperties.labelSize.options}
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
          handlePropertyChange={this.props.handlePropertyChange}
          styleProperty={this.props.styleProperties.iconOrientation}
          fields={this.state.numberFields}
          defaultStaticStyleOptions={this.state.defaultStaticProperties.iconOrientation.options}
          defaultDynamicStyleOptions={this.state.defaultDynamicProperties.iconOrientation.options}
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
