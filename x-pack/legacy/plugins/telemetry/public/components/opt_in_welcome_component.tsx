/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCheckbox,
  makeId,
} from '@elastic/eui';
import { OptInMessage } from './opt_in_message';

interface Props {
  fetchTelemetry: () => {};
  optInClick: () => {};
}
interface State {
  checked: boolean;
}

export class OptInCheckbox extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      checked: false,
    }
  }
  onChange = (e: any) => {
    this.setState({
      checked: e.target.checked,
    });
  };

  render() {

    const label = <OptInMessage
      fetchTelemetry={this.props.fetchTelemetry}
    />;
    return (
      <React.Fragment>
        <EuiCheckbox
          id="telemetry__opt_in_checkbox"
          label={label}
          checked={this.state.checked}
          onChange={this.onChange}
        />
      </React.Fragment>
    )
  }
}
