/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiIcon,
  EuiForm,
  EuiFormRow,
  EuiSuperSelect,
  EuiTextColor,
  EuiText,
  EuiFieldText,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

const GEO_FIELD_VALUE_DELIMITER = '//'; // `/` is not allowed in index pattern name so should not have collisions

function createIndexGeoFieldName({ indexPatternTitle, geoFieldName }) {
  return `${indexPatternTitle}${GEO_FIELD_VALUE_DELIMITER}${geoFieldName}`;
}

export class FeatureGeometryFilterForm extends Component {

  // TODO add ability to specify spatial relationship

  state = {
    geoField: createIndexGeoFieldName(this.props.geoFields[0]),
    geometryName: this.props.feature.geometry.type.toLowerCase(),
  };

  _onGeoFieldChange = selectedValue => {
    this.setState({ geoField: selectedValue });
  }

  _onGeometryNameChange = e => {
    this.setState({
      geometryName: e.target.value,
    });
  };

  _createFilter = () => {

  }

  _renderHeader() {
    return (
      <button
        className="euiContextMenuPanelTitle"
        type="button"
        onClick={this.props.onClose}
      >
        <span className="euiContextMenu__itemLayout">
          <EuiIcon
            type="arrowLeft"
            size="m"
            className="euiContextMenu__icon"
          />

          <span className="euiContextMenu__text">
            <FormattedMessage
              id="xpack.maps.tooltip.geometryFilterForm.viewProperties"
              defaultMessage="View propeties"
            />
          </span>
        </span>
      </button>
    );
  }

  _renderForm() {
    const options = this.props.geoFields.map(({ indexPatternTitle, geoFieldName }) => {
      const value = createIndexGeoFieldName({ indexPatternTitle, geoFieldName });
      let inputDisplay;
      if (value === this.state.geoField) {
        // do not show index name in select box to avoid clipping
        inputDisplay = geoFieldName;
      } else {
        inputDisplay = (
          <EuiText>
            <EuiTextColor color="subdued">
              <small>{indexPatternTitle}</small>
            </EuiTextColor>
            <br />
            {geoFieldName}
          </EuiText>
        );
      }
      return {
        inputDisplay,
        value
      };
    });
    return (
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.maps.tooltip.geometryFilterForm.geometryNameLabel', {
            defaultMessage: 'Geometry name'
          })}
        >
          <EuiFieldText
            value={this.state.geometryName}
            onChange={this._onGeometryNameChange}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.maps.tooltip.geometryFilterForm.geoFieldLabel', {
            defaultMessage: 'Geospatial field'
          })}
        >
          <EuiSuperSelect
            options={options}
            valueOfSelected={this.state.geoField}
            onChange={this._onGeoFieldChange}
            hasDividers={true}
            fullWidth={true}
            compressed={true}
            itemClassName="mapFeatureTooltip__geoFieldItem"
          />
        </EuiFormRow>
        <EuiButton
          onClick={this._createFilter}
          isDisabled={!this.state.geometryName || !this.state.geoField}
        >
          <FormattedMessage
            id="xpack.maps.tooltip.geometryFilterForm.createFilterButtonLabel"
            defaultMessage="Create filter"
          />
        </EuiButton>
      </EuiForm>
    );
  }

  render() {
    return (
      <Fragment>
        {this._renderHeader()}
        {this._renderForm()}
      </Fragment>
    );
  }

}

