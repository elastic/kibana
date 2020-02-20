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
  EuiSpacer,
  EuiTextAlign,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ES_GEO_FIELD_TYPE } from '../../common/constants';

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

export class DistanceFilterForm extends Component {
  static propTypes = {
    buttonLabel: PropTypes.string.isRequired,
    geoFields: PropTypes.array.isRequired,
    onSubmit: PropTypes.func.isRequired,
  };

  state = {
    geoFieldTag: this.props.geoFields.length
      ? createIndexGeoFieldName(this.props.geoFields[0])
      : '',
    filterLabel: '',
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

  _onFilterLabelChange = e => {
    this.setState({
      filterLabel: e.target.value,
    });
  };

  _onSubmit = () => {
    const geoField = this._getSelectedGeoField();
    this.props.onSubmit({
      filterLabel: this.state.filterLabel,
      indexPatternId: geoField.indexPatternId,
      geoFieldName: geoField.geoFieldName,
    });
  };

  render() {
    const options = this.props.geoFields
      .filter(({ geoFieldType }) => {
        return geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT;
      })
      .map(({ indexPatternTitle, geoFieldName }) => {
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

        <EuiFormRow
          className="mapGeometryFilter__geoFieldSuperSelectWrapper"
          label={i18n.translate('xpack.maps.distanceFilterForm.geoFieldLabel', {
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

        <EuiSpacer size="m" />

        <EuiTextAlign textAlign="right">
          <EuiButton size="s" fill onClick={this._onSubmit} isDisabled={!this.state.geoFieldTag}>
            {this.props.buttonLabel}
          </EuiButton>
        </EuiTextAlign>
      </EuiForm>
    );
  }
}
