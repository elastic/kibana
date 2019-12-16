/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { StylePropertyLegendRow } from './style_property_legend_row';

export class VectorStyleLegend extends Component {
  state = {
    rows: [],
  };

  componentDidMount() {
    this._isMounted = true;
    this._prevRowDescriptors = undefined;
    this._loadRows();
  }

  componentDidUpdate() {
    this._loadRows();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _loadRows = _.debounce(async () => {
    const rows = await this.props.loadRows();
    const rowDescriptors = rows.map(row => {
      return {
        label: row.label,
        range: row.range,
        styleOptions: row.style.getOptions(),
      };
    });
    if (this._isMounted && !_.isEqual(rowDescriptors, this._prevRowDescriptors)) {
      this._prevRowDescriptors = rowDescriptors;
      this.setState({ rows });
    }
  }, 100);

  render() {
    return this.state.rows.map(rowProps => {
      return <StylePropertyLegendRow key={rowProps.style.getStyleName()} {...rowProps} />;
    });
  }
}

VectorStyleLegend.propTypes = {
  loadRows: PropTypes.func.isRequired,
};
