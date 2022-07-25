/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';

interface CounterParams {
  counter: number;
}

export class SelfChangingEditor extends React.Component<VisEditorOptionsProps<CounterParams>> {
  onCounterChange = (ev: any) => {
    this.props.setValue('counter', parseInt(ev.target.value, 10));
  };

  render() {
    return (
      <EuiFormRow label="Counter">
        <EuiFieldNumber
          value={this.props.stateParams.counter}
          onChange={this.onCounterChange}
          step={1}
          data-test-subj="counterEditor"
        />
      </EuiFormRow>
    );
  }
}
