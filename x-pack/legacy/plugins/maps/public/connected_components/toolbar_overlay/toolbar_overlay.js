/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SetViewControl } from './set_view_control';
import { ToolsControl } from './tools_control';

export class ToolbarOverlay extends React.Component {
  _renderToolsControl() {
    const { addFilters, geoFields } = this.props;
    if (!addFilters || !geoFields.length) {
      return null;
    }

    return (
      <EuiFlexItem>
        <ToolsControl geoFields={geoFields} />
      </EuiFlexItem>
    );
  }

  render() {
    return (
      <EuiFlexGroup
        className="mapToolbarOverlay"
        responsive={false}
        direction="column"
        alignItems="flexStart"
        gutterSize="s"
      >
        <EuiFlexItem>
          <SetViewControl />
        </EuiFlexItem>

        {this._renderToolsControl()}
      </EuiFlexGroup>
    );
  }
}
