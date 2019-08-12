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
  EuiSelect,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { createSpatialFilterWithGeometry } from '../../elasticsearch_geo_utils';
import {
  ES_GEO_FIELD_TYPE,
  ES_SPATIAL_RELATIONS,
  GEO_JSON_TYPE,
} from '../../../common/constants';
import { getEsSpatialRelationLabel } from '../../../common/i18n_getters';

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

  state = {
    geoFieldTag: createIndexGeoFieldName(this.props.geoFields[0]),
    geometryLabel: this.props.feature.geometry.type.toLowerCase(),
    relation: ES_SPATIAL_RELATIONS.INTERSECTS,
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
  }

  _onRelationChange = e => {
    this.setState({
      relation: e.target.value,
    });
  }

  _createFilter = () => {
    const geoField = this._getSelectedGeoField();
    const filter = createSpatialFilterWithGeometry({
      geometry: this.props.feature.geometry,
      geometryLabel: this.state.geometryLabel,
      indexPatternId: geoField.indexPatternId,
      geoFieldName: geoField.geoFieldName,
      geoFieldType: geoField.geoFieldType,
      relation: this.state.relation,
    });
    this.props.addFilters([filter]);
    this.props.onClose();
  }

  _renderHeader() {
    return (
      <button
        className="euiContextMenuPanelTitle"
        type="button"
        onClick={this.props.showPropertiesView}
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

  _renderRelationInput() {
    if (!this.state.geoFieldTag) {
      return null;
    }

    const { geoFieldType } = this._getSelectedGeoField();

    // relationship only used when filtering geo_shape fields
    if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT) {
      return null;
    }

    const options = Object.values(ES_SPATIAL_RELATIONS)
      .filter(relation => {
        // line geometries can not filter by within relation since there is no closed shape
        if (this.props.feature.geometry.type === GEO_JSON_TYPE.LINE_STRING
          || this.props.feature.geometry.type === GEO_JSON_TYPE.MULTI_LINE_STRING) {
          return relation !== ES_SPATIAL_RELATIONS.WITHIN;
        }

        return true;
      })
      .map(relation => {
        return {
          value: relation,
          text: getEsSpatialRelationLabel(relation)
        };
      });

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.tooltip.geometryFilterForm.relationLabel', {
          defaultMessage: 'Spatial relation'
        })}
        compressed
      >
        <EuiSelect
          options={options}
          value={this.state.relation}
          onChange={this._onRelationChange}
        />

      </EuiFormRow>
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
            defaultMessage: 'Geometry label'
          })}
          compressed
        >
          <EuiFieldText
            value={this.state.geometryLabel}
            onChange={this._onGeometryLabelChange}
          />
        </EuiFormRow>

        <EuiFormRow
          className="mapFeatureTooltip_geoFieldSuperSelectWrapper"
          label={i18n.translate('xpack.maps.tooltip.geometryFilterForm.geoFieldLabel', {
            defaultMessage: 'Filtered field'
          })}
          compressed
        >
          <EuiSuperSelect
            className="mapFeatureTooltip_geoFieldSuperSelect"
            options={options}
            valueOfSelected={this.state.geoFieldTag}
            onChange={this._onGeoFieldChange}
            hasDividers={true}
            fullWidth={true}
            compressed={true}
            itemClassName="mapFeatureTooltip__geoFieldItem"
          />
        </EuiFormRow>

        {this._renderRelationInput()}

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

