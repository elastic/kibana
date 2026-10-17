/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import { useBoundInput } from './use_bound_input';

export const SelectNode = ({ node }: { node: AppNodeOfType<'select'> }) => {
  const { value, change } = useBoundInput(node);

  return (
    <EuiFormRow label={node.label} data-node-id={node.id}>
      <EuiSelect
        compressed
        value={value}
        // A state value that is none of the options, such as an empty default, shows as nothing
        // selected rather than as the first option, which it is not.
        hasNoInitialSelection={!node.options.some((option) => option.value === value)}
        options={node.options.map((option) => ({
          value: option.value,
          text: option.label ?? option.value,
        }))}
        onChange={(event) => change(event.target.value)}
      />
    </EuiFormRow>
  );
};
