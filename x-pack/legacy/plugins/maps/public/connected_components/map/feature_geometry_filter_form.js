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
import { createSpatialFilterWithGeometry } from '../../elasticsearch_geo_utils';

const GEO_FIELD_VALUE_DELIMITER = '//'; // `/` is not allowed in index pattern name so should not have collisions

function createIndexGeoFieldName({ indexPatternTitle, geoFieldName }) {
  return `${indexPatternTitle}${GEO_FIELD_VALUE_DELIMITER}${geoFieldName}`;
}

function splitIndexGeoFieldName(value) {
  const split = value.split(GEO_FIELD_VALUE_DELIMITER);
  return {
    indexPatternTitle: split[0],
    geoFieldName: split[1]
  };
}

export class FeatureGeometryFilterForm extends Component {

  // TODO add ability to specify spatial relationship

  state = {
    geoFieldTag: createIndexGeoFieldName(this.props.geoFields[0]),
    geometryLabel: this.props.feature.geometry.type.toLowerCase(),
  };

  _getSelectedGeoField = () => {
    if (!this.state.geoFieldTag) {
      return null;
    }

    const {
      indexPatternTitle,
      geoFieldName
    } = splitIndexGeoFieldName(this.state.geoFieldTag);

    return this.props.geoFields.find(option => {
      return option.indexPatternTitle === indexPatternTitle
        && option.geoFieldName === geoFieldName;
    });
  }

  _onGeoFieldChange = selectedValue => {
    this.setState({ geoFieldTag: selectedValue });
  }

  _onGeometryLabelChange = e => {
    this.setState({
      geometryLabel: e.target.value,
    });
  };

  _createFilter = () => {
    const geoField = this._getSelectedGeoField();
    const filter = createSpatialFilterWithGeometry({
      geometry: this.props.feature.geometry,
      geometryLabel: this.state.geometryLabel,
      indexPatternId: geoField.indexPatternId,
      geoFieldName: geoField.geoFieldName,
      geoFieldType: geoField.geoFieldType,
      relation: 'intersects',
    });
    this.props.addFilters([filter]);
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
      return {
        inputDisplay: (
          <EuiText>
            <EuiTextColor color="subdued">
              <small>{indexPatternTitle}</small>
            </EuiTextColor>
            <br />
            {geoFieldName}
          </EuiText>
        ),
        value: createIndexGeoFieldName({ indexPatternTitle, geoFieldName })
      };
    });
    return (
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.maps.tooltip.geometryFilterForm.geometryLabelLabel', {
            defaultMessage: 'Geometry name'
          })}
        >
          <EuiFieldText
            value={this.state.geometryLabel}
            onChange={this._onGeometryLabelChange}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.maps.tooltip.geometryFilterForm.geoFieldLabel', {
            defaultMessage: 'Geospatial field'
          })}
        >
          <EuiSuperSelect
            options={options}
            valueOfSelected={this.state.geoFieldTag}
            onChange={this._onGeoFieldChange}
            hasDividers={true}
            fullWidth={true}
            compressed={true}
            itemClassName="mapFeatureTooltip__geoFieldItem"
          />
        </EuiFormRow>
        <EuiButton
          onClick={this._createFilter}
          isDisabled={!this.state.geometryLabel || !this.state.geoFieldTag}
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

