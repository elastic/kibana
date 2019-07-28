/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { EuiCheckbox } from '@elastic/eui';
import { OptInMessage } from './opt_in_message';

interface Props {
  fetchTelemetry: () => Promise<any[]>;
  optInClick: () => {};
}
interface State {
  checked: boolean;
}

export class OptInCheckbox extends React.PureComponent<Props, State> {
  public readonly state: State = {
    checked: false,
  };

  onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ checked: e.target.checked });
  };

  render() {
    return (
      <React.Fragment>
        <EuiCheckbox
          id="telemetry__opt_in_checkbox"
          label={<OptInMessage fetchTelemetry={this.props.fetchTelemetry} />}
          checked={this.state.checked}
          onChange={this.onChange}
        />
      </React.Fragment>
    );
  }
}
