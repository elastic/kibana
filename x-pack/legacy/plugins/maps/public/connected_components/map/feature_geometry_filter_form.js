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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

const GEO_FIELD_VALUE_DELIMITER = '//'; // `/` is not allowed in index pattern name so should not have collisions

export class FeatureGeometryFilterForm extends Component {



  state = {
    geoField: undefined
  };

  _onGeoFieldChange = selectedValue => {
    this.setState({ geoField: selectedValue });
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
    const options = this.props.geoFields.map(geoField => {
      return {
        inputDisplay: (
          <EuiText>
            <EuiTextColor color="subdued">
              <small>{geoField.indexPatternTitle}</small>
            </EuiTextColor>
            <br />
            {geoField.geoFieldName}
          </EuiText>
        ),
        value: `${geoField.indexPatternTitle}${GEO_FIELD_VALUE_DELIMITER}${geoField.geoFieldName}`
      };
    });
    return (
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.maps.tooltip.geometryFilterForm.geoFieldLabel', {
            defaultMessage: 'Field'
          })}
          helpText={i18n.translate('xpack.maps.tooltip.geometryFilterForm.geoFieldHelpText', {
            defaultMessage: 'Shape filter is applied to selected field.'
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

