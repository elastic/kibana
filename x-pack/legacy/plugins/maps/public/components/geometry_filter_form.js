/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiForm,
  EuiFormRow,
  EuiSuperSelect,
  EuiTextColor,
  EuiText,
  EuiFieldText,
  EuiButton,
  EuiSelect,
  EuiSpacer,
  EuiTextAlign,
  EuiFormErrorText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ES_GEO_FIELD_TYPE, ES_SPATIAL_RELATIONS } from '../../common/constants';
import { getEsSpatialRelationLabel } from '../../common/i18n_getters';

const GEO_FIELD_VALUE_DELIMITER = '/'; // `/` is not allowed in index pattern name so should not have collisions

function createIndexGeoFieldName({ indexPatternTitle, geoFieldName }) {
  return `${indexPatternTitle}${GEO_FIELD_VALUE_DELIMITER}${geoFieldName}`;
}

function splitIndexGeoFieldName(value) {
  const split = value.split(GEO_FIELD_VALUE_DELIMITER);
  return {
    indexPatternTitle: split[0],
    geoFieldName: split[1],
  };
}

export class GeometryFilterForm extends Component {
  static propTypes = {
    buttonLabel: PropTypes.string.isRequired,
    geoFields: PropTypes.array.isRequired,
    intitialGeometryLabel: PropTypes.string.isRequired,
    onSubmit: PropTypes.func.isRequired,
    isFilterGeometryClosed: PropTypes.bool,
    errorMsg: PropTypes.string,
  };

  static defaultProps = {
    isFilterGeometryClosed: true,
  };

  state = {
    geoFieldTag: this.props.geoFields.length
      ? createIndexGeoFieldName(this.props.geoFields[0])
      : '',
    geometryLabel: this.props.intitialGeometryLabel,
    relation: ES_SPATIAL_RELATIONS.INTERSECTS,
  };

  _getSelectedGeoField = () => {
    if (!this.state.geoFieldTag) {
      return null;
    }

    const { indexPatternTitle, geoFieldName } = splitIndexGeoFieldName(this.state.geoFieldTag);

    return this.props.geoFields.find(option => {
      return option.indexPatternTitle === indexPatternTitle && option.geoFieldName === geoFieldName;
    });
  };

  _onGeoFieldChange = selectedValue => {
    this.setState({ geoFieldTag: selectedValue });
  };

  _onGeometryLabelChange = e => {
    this.setState({
      geometryLabel: e.target.value,
    });
  };

  _onRelationChange = e => {
    this.setState({
      relation: e.target.value,
    });
  };

  _onSubmit = () => {
    const geoField = this._getSelectedGeoField();
    this.props.onSubmit({
      geometryLabel: this.state.geometryLabel,
      indexPatternId: geoField.indexPatternId,
      geoFieldName: geoField.geoFieldName,
      geoFieldType: geoField.geoFieldType,
      relation: this.state.relation,
    });
  };

  _renderRelationInput() {
    if (!this.state.geoFieldTag) {
      return null;
    }

    const { geoFieldType } = this._getSelectedGeoField();

    // relationship only used when filtering geo_shape fields
    if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT) {
      return null;
    }

    const spatialRelations = this.props.isFilterGeometryClosed
      ? Object.values(ES_SPATIAL_RELATIONS)
      : Object.values(ES_SPATIAL_RELATIONS).filter(relation => {
        // can not filter by within relation when filtering geometry is not closed
        return relation !== ES_SPATIAL_RELATIONS.WITHIN;
      });
    const options = spatialRelations.map(relation => {
      return {
        value: relation,
        text: getEsSpatialRelationLabel(relation),
      };
    });

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.geometryFilterForm.relationLabel', {
          defaultMessage: 'Spatial relation',
        })}
        display="rowCompressed"
      >
        <EuiSelect
          compressed
          options={options}
          value={this.state.relation}
          onChange={this._onRelationChange}
        />
      </EuiFormRow>
    );
  }

  render() {
    const options = this.props.geoFields.map(({ indexPatternTitle, geoFieldName }) => {
      return {
        inputDisplay: (
          <EuiText size="s" component="span">
            <EuiTextColor color="subdued">
              <small>{indexPatternTitle}</small>
            </EuiTextColor>
            <br />
            {geoFieldName}
          </EuiText>
        ),
        value: createIndexGeoFieldName({ indexPatternTitle, geoFieldName }),
      };
    });
    let error;
    if (this.props.errorMsg) {
      error = <EuiFormErrorText>{this.props.errorMsg}</EuiFormErrorText>;
    }
    return (
      <EuiForm className={this.props.className}>
        <EuiFormRow
          label={i18n.translate('xpack.maps.geometryFilterForm.geometryLabelLabel', {
            defaultMessage: 'Geometry label',
          })}
          display="rowCompressed"
        >
          <EuiFieldText
            compressed
            value={this.state.geometryLabel}
            onChange={this._onGeometryLabelChange}
          />
        </EuiFormRow>

        <EuiFormRow
          className="mapGeometryFilter__geoFieldSuperSelectWrapper"
          label={i18n.translate('xpack.maps.geometryFilterForm.geoFieldLabel', {
            defaultMessage: 'Filtered field',
          })}
          display="rowCompressed"
        >
          <EuiSuperSelect
            className="mapGeometryFilter__geoFieldSuperSelect"
            options={options}
            valueOfSelected={this.state.geoFieldTag}
            onChange={this._onGeoFieldChange}
            hasDividers={true}
            fullWidth={true}
            compressed={true}
            itemClassName="mapGeometryFilter__geoFieldItem"
          />
        </EuiFormRow>

        {this._renderRelationInput()}

        <EuiSpacer size="m" />

        {error}

        <EuiTextAlign textAlign="right">
          <EuiButton
            size="s"
            fill
            onClick={this._onSubmit}
            isDisabled={!this.state.geometryLabel || !this.state.geoFieldTag}
            isLoading={this.props.isLoading}
          >
            {this.props.buttonLabel}
          </EuiButton>
        </EuiTextAlign>
      </EuiForm>
    );
  }
}
