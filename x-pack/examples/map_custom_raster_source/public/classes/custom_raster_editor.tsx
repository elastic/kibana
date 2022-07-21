/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, ChangeEvent } from 'react';
import _ from 'lodash';
import { EuiFormRow, EuiFieldText, EuiPanel } from '@elastic/eui';
import type { CustomRasterSourceConfig } from './custom_raster_source';

interface Props {
  onSourceConfigChange: (sourceConfig: CustomRasterSourceConfig | null) => void;
  defaultUrl: string;
}

interface State {
  url: string;
}

export class CustomRasterEditor extends Component<Props, State> {
  state = {
    url: '',
  };

  componentDidMount() {
    this.props.onSourceConfigChange({ urlTemplate: this.props.defaultUrl, isTimeAware: true });
  }

  _previewLayer = _.debounce(() => {
    const { url } = this.state;
    const isUrlValid = ['{x}', '{y}', '{z}'].every((template) => url.indexOf(template) >= 0);
    const isTimeAware = url.indexOf('{time}') >= 0;
    const sourceConfig = isUrlValid ? { urlTemplate: url, isTimeAware } : null;
    this.props.onSourceConfigChange(sourceConfig);
  }, 500);

  _onUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({ url: event.target.value }, this._previewLayer);
  };

  render() {
    return (
      <EuiPanel>
        <EuiFormRow label="Url">
          <EuiFieldText defaultValue={this.props.defaultUrl} onChange={this._onUrlChange} />
        </EuiFormRow>
      </EuiPanel>
    );
  }
}
