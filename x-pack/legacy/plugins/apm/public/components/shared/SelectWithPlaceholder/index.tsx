/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSelect } from '@elastic/eui';
import { isEmpty } from 'lodash';

const NO_SELECTION = 'NO_SELECTION';

/**
 * This component addresses some cross-browser inconsistencies of `EuiSelect`
 * with `hasNoInitialSelection`. It uses the `placeholder` prop to populate
 * the first option as the initial, not selected option.
 */
export const SelectWithPlaceholder: typeof EuiSelect = props => (
  <EuiSelect
    {...props}
    options={[
      { text: props.placeholder, value: NO_SELECTION },
      ...(props.options || [])
    ]}
    value={isEmpty(props.value) ? NO_SELECTION : props.value}
    onChange={e => {
      if (props.onChange) {
        props.onChange(
          Object.assign(e, {
            target: Object.assign(e.target, {
              value:
                e.target.value === NO_SELECTION ? undefined : e.target.value
            })
          })
        );
      }
    }}
  />
);
