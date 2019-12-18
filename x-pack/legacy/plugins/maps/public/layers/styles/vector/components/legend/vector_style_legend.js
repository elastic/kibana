/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component, Fragment } from 'react';

export class VectorStyleLegend extends Component {
  state = {
    styles: [],
  };

  componentDidMount() {
    this._isMounted = true;
    this._prevStyleDescriptors = undefined;
    this._loadRows();
  }

  componentDidUpdate() {
    this._loadRows();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _loadRows = _.debounce(async () => {
    const styles = await this.props.stylesPromise;
    const styleDescriptorPromises = styles.map(async style => {
      return {
        type: style.getStyleName(),
        options: style.getOptions(),
        fieldMeta: style.getFieldMeta(),
        label: await style.getField().getLabel(),
      };
    });

    const styleDescriptors = await Promise.all(styleDescriptorPromises);
    if (this._isMounted && !_.isEqual(styleDescriptors, this._prevStyleDescriptors)) {
      this._prevStyleDescriptors = styleDescriptors;
      this.setState({ styles: styles });
    }
  }, 100);

  render() {
    return this.state.styles.map(style => {
      return <Fragment key={style.getStyleName()}>{style.renderLegendDetailRow()}</Fragment>;
    });
  }
}
