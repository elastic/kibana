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
  EuiFieldText,
  EuiButton,
  EuiSpacer,
  EuiTextAlign,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MultiIndexGeoFieldSelect } from './multi_index_geo_field_select';

export class DistanceFilterForm extends Component {
  static propTypes = {
    buttonLabel: PropTypes.string.isRequired,
    geoFields: PropTypes.array.isRequired,
    onSubmit: PropTypes.func.isRequired,
  };

  state = {
    selectedField: this.props.geoFields.length ? this.props.geoFields[0] : undefined,
    filterLabel: '',
  };

  _onGeoFieldChange = selectedField => {
    this.setState({ selectedField });
  };

  _onFilterLabelChange = e => {
    this.setState({
      filterLabel: e.target.value,
    });
  };

  _onSubmit = () => {
    this.props.onSubmit({
      filterLabel: this.state.filterLabel,
      indexPatternId: this.state.selectedField.indexPatternId,
      geoFieldName: this.state.selectedField.geoFieldName,
    });
  };

  render() {
    return (
      <EuiForm className={this.props.className}>
        <EuiFormRow
          label={i18n.translate('xpack.maps.distanceFilterForm.filterLabelLabel', {
            defaultMessage: 'Filter label',
          })}
          display="rowCompressed"
        >
          <EuiFieldText
            compressed
            value={this.state.filterLabel}
            onChange={this._onFilterLabelChange}
          />
        </EuiFormRow>

        <MultiIndexGeoFieldSelect
          selectedField={this.state.selectedField}
          fields={this.props.geoFields}
          onChange={this._onGeoFieldChange}
        />

        <EuiSpacer size="m" />

        <EuiTextAlign textAlign="right">
          <EuiButton size="s" fill onClick={this._onSubmit} isDisabled={!this.state.selectedField}>
            {this.props.buttonLabel}
          </EuiButton>
        </EuiTextAlign>
      </EuiForm>
    );
  }
}
