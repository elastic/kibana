/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import _ from 'lodash';
import { EuiFormRow, EuiFieldText, EuiPanel } from '@elastic/eui';

export type XYZTMSSourceConfig = {
  urlTemplate: string;
};

interface Props {
  onSourceConfigChange: (sourceConfig: XYZTMSSourceConfig | null) => void;
}

interface State {
  url: string;
}

export class XYZTMSEditor extends Component<Props, State> {
  state = {
    url: '',
  };

  _previewLayer = _.debounce(() => {
    const { url } = this.state;

    const isUrlValid =
      url.indexOf('{x}') >= 0 && url.indexOf('{y}') >= 0 && url.indexOf('{z}') >= 0;
    const sourceConfig = isUrlValid ? { urlTemplate: url } : null;
    this.props.onSourceConfigChange(sourceConfig);
  }, 500);

  _onUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({ url: event.target.value }, this._previewLayer);
  };

  render() {
    return (
      <EuiPanel>
        <EuiFormRow label="Url">
          <EuiFieldText
            placeholder={'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            onChange={this._onUrlChange}
          />
        </EuiFormRow>
      </EuiPanel>
    );
  }
}
