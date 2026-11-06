/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import { useBoundInput } from './use_bound_input';

export const ButtonGroupNode = ({ node }: { node: AppNodeOfType<'button_group'> }) => {
  const { value, change } = useBoundInput(node);

  return (
    <EuiFormRow label={node.label} data-node-id={node.id}>
      <EuiButtonGroup
        isFullWidth
        buttonSize="compressed"
        legend={node.label}
        options={node.options.map((option) => ({
          id: option.value,
          label: option.label ?? option.value,
        }))}
        idSelected={value}
        onChange={change}
      />
    </EuiFormRow>
  );
};
