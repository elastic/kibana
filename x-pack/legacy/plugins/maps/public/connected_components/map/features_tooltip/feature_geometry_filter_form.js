/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { createSpatialFilterWithGeometry } from '../../../elasticsearch_geo_utils';
import { GEO_JSON_TYPE } from '../../../../common/constants';
import { GeometryFilterForm } from '../../../components/geometry_filter_form';

export class FeatureGeometryFilterForm extends Component {

  state = {
    isLoading: false,
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _loadPreIndexedShape = async () => {
    this.setState({
      isLoading: true,
    });

    let preIndexedShape;
    try {
      preIndexedShape = await this.props.loadPreIndexedShape();
    } catch (err) {
      // ignore error, just fall back to using geometry if preIndexedShape can not be fetched
    }

    if (this._isMounted) {
      this.setState({ isLoading: false });
    }

    return preIndexedShape;
  }

  _createFilter = async ({ geometryLabel, indexPatternId, geoFieldName, geoFieldType, relation }) => {
    const preIndexedShape = await this._loadPreIndexedShape();
    if (!this._isMounted) {
      // do not create filter if component is unmounted
      return;
    }

    const filter = createSpatialFilterWithGeometry({
      preIndexedShape,
      geometry: this.props.geometry,
      geometryLabel,
      indexPatternId,
      geoFieldName,
      geoFieldType,
      relation,
    });
    this.props.addFilters([filter]);
    this.props.onClose();
  }

  _renderHeader() {
    return (
      <button
        className="euiContextMenuPanelTitle mapFeatureTooltip_backButton"
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
              id="xpack.maps.tooltip.showGeometryFilterViewLinkLabel"
              defaultMessage="Filter by geometry"
            />
          </span>
        </span>
      </button>
    );
  }

  _renderForm() {
    return (
      <GeometryFilterForm
        buttonLabel={i18n.translate('xpack.maps.tooltip.geometryFilterForm.createFilterButtonLabel', {
          defaultMessage: 'Create filter'
        })}
        geoFields={this.props.geoFields}
        intitialGeometryLabel={this.props.geometry.type.toLowerCase()}
        onSubmit={this._createFilter}
        isFilterGeometryClosed={this.props.geometry.type !== GEO_JSON_TYPE.LINE_STRING
          && this.props.geometry.type !== GEO_JSON_TYPE.MULTI_LINE_STRING}
        isLoading={this.state.isLoading}
      />
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
