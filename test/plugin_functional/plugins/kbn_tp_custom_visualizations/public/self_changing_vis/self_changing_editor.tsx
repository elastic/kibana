/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { VisOptionsProps } from 'src/plugins/vis_default_editor/public/vis_options_props';

interface CounterParams {
  counter: number;
}

export class SelfChangingEditor extends React.Component<VisOptionsProps<CounterParams>> {
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
