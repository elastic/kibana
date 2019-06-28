/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { Component } from 'react';
import { Space } from '../../../common/model/space';
import { SpaceCard } from './space_card';

interface Props {
  spaces: Space[];
  onSpaceSelect: (space: Space) => void;
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

  public renderSpace = (space: Space) => (
    <EuiFlexItem key={space.id} grow={false}>
      <SpaceCard space={space} onClick={this.createSpaceClickHandler(space)} />
    </EuiFlexItem>
  );

  public createSpaceClickHandler = (space: Space) => {
    return () => {
      this.props.onSpaceSelect(space);
    };
  };
}
