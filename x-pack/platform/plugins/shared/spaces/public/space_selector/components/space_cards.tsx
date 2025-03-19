/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './space_cards.scss';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { Component } from 'react';

import { SpaceCard } from './space_card';
import type { Space } from '../../../common';

interface Props {
  spaces: Space[];
  serverBasePath: string;
}

export class SpaceCards extends Component<Props, {}> {
  public render() {
    return (
      <div className="spaceCards">
        <EuiFlexGroup gutterSize="l" justifyContent="center" wrap responsive={false}>
          {this.props.spaces.map(this.renderSpace)}
        </EuiFlexGroup>
      </div>
    );
  }

  private renderSpace = (space: Space) => (
    <EuiFlexItem key={space.id} grow={false}>
      <SpaceCard space={space} serverBasePath={this.props.serverBasePath} />
    </EuiFlexItem>
  );
}
