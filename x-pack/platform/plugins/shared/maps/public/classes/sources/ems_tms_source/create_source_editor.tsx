/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiPanel } from '@elastic/eui';
import { EmsTmsSourceConfig, TileServiceSelect } from './tile_service_select';

interface Props {
  onTileSelect: (sourceConfig: EmsTmsSourceConfig) => void;
}

interface State {
  config?: EmsTmsSourceConfig;
}

export class CreateSourceEditor extends Component<Props, State> {
  state: State = {};

  componentDidMount() {
    this._onTileSelect({ isAutoSelect: true });
  }

  _onTileSelect = (config: EmsTmsSourceConfig) => {
    this.setState({ config });
    this.props.onTileSelect(config);
  };

  render() {
    return (
      <EuiPanel>
        <TileServiceSelect onTileSelect={this._onTileSelect} config={this.state.config} />
      </EuiPanel>
    );
  }
}
