/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { TooltipSelector } from '../../../components/tooltip_selector';
import { getEMSClient } from '../../../meta';
import { EMSRegionLayerField } from '../../fields/ems_region_field';

export class UpdateSourceEditor extends Component {

  static propTypes = {
    onChange: PropTypes.func.isRequired,
    tooltipFields: PropTypes.arrayOf(PropTypes.object).isRequired,
    source: PropTypes.object
  };

  state = {
    fields: null,
  };

  componentDidMount() {
    this._isMounted = true;
    this.loadFields();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async loadFields() {
    let fields;
    try {
      const emsClient = getEMSClient();
      const emsFiles = await emsClient.getFileLayers();
      const emsFile = emsFiles.find((emsFile => emsFile.getId() === this.props.layerId));
      const emsFields = emsFile.getFieldsInLanguage();
      fields = emsFields.map(field => new EMSRegionLayerField({
        fieldName: field.name,
        source: this.props.source
      }));
    } catch(e) {
      //swallow this error. when a matching EMS-config cannot be found, the source already will have thrown errors during the data request. This will propagate to the vector-layer and be displayed in the UX
      fields = [];
    }

    if (this._isMounted) {
      this.setState({ fields: fields });
    }
  }

  _onTooltipPropertiesSelect = (propertyNames) => {
    this.props.onChange({ propName: 'tooltipProperties', value: propertyNames });
  };

  render() {

    if (!this.state.fields) {
      return null;
    }

    return (
      <TooltipSelector
        tooltipFields={this.props.tooltipFields}
        onChange={this._onTooltipPropertiesSelect}
        fields={this.state.fields}
      />
    );
  }
}
