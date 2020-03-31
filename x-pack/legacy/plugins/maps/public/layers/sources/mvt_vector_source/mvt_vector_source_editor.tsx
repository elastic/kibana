/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import _ from 'lodash';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export class MVTVectorSourceEditor extends React.Component {
  state = {
    mvtInput: '',
    layerName: '',
    mvtCanPreview: false,
  };

  _sourceConfigChange = _.debounce(() => {
    if (this.state.mvtCanPreview && this.state.layerName) {
      this.props.onSourceConfigChange({
        urlTemplate: this.state.mvtInput,
        layerName: this.state.layerName,
      });
    }
  }, 2000);

  _handleMVTInputChange(e) {
    const url = e.target.value;

    const canPreview =
      url.indexOf('{x}') >= 0 && url.indexOf('{y}') >= 0 && url.indexOf('{z}') >= 0;
    this.setState(
      {
        mvtInput: url,
        mvtCanPreview: canPreview,
      },
      () => this._sourceConfigChange()
    );
  }

  _handleLayerNameInputChange(e) {
    const layerName = e.target.value;
    this.setState(
      {
        layerName,
      },
      () => this._sourceConfigChange()
    );
  }

  render() {
    const example = `https://tiles.maps.elastic.co/data/v3/{z}/{x}/{y}.pbf`;
    return (
      <Fragment>
        <div>{example}</div>
        <EuiFormRow label="Url">
          <EuiFieldText value={``} onChange={e => this._handleMVTInputChange(e)} />
          <EuiFieldText value={``} onChange={e => this._handleLayerNameInputChange(e)} />
        </EuiFormRow>
      </Fragment>
    );
  }
}
