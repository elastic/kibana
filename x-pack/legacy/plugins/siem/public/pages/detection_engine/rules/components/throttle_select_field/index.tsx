/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { SelectField } from '../../../../../shared_imports';

export const THROTTLE_OPTIONS = [
  { value: 'no_actions', text: 'Perform no actions' },
  { value: 'signal', text: 'On each signal detected' },
  { value: 'rule', text: 'On each rule execution' },
  { value: '5m', text: '5 minutes' },
  { value: '1h', text: 'Hourly' },
  { value: '1d', text: 'Daily' },
];

type ThrottleSelectField = typeof SelectField;

export const ThrottleSelectField: ThrottleSelectField = props => (
  <>
    <SelectField {...props} />
    {props.field.value === 'signal' && (
      <>
        <EuiSpacer />
        <EuiCallOut
          title="Selected frequency will trigger a high quantity of actions"
          color="warning"
          iconType="alert"
        >
          {
            'The currently selected action frequency will likely trigger an extremely high quantity of actions to run. If this is not desirable, it is recommended that you alter your selection above in order to trigger less actions.'
          }
        </EuiCallOut>
      </>
    )}
  </>
);
