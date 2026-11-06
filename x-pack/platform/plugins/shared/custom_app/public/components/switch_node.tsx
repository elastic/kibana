/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import { useAppRuntime, useStateValues } from '../runtime/app_runtime_context';

/** A switch for a true or a false of the app: it shows the value of its key, and a change sets it. */
export const SwitchNode = ({ node }: { node: AppNodeOfType<'switch'> }) => {
  const runtime = useAppRuntime();
  const state = useStateValues();
  const { bind, onChange } = node;

  const change = useCallback(
    (next: boolean) => {
      runtime.run([{ type: 'setState', key: bind, value: { fromInput: true } }, ...onChange], {
        input: next,
      });
    },
    [runtime, bind, onChange]
  );

  return (
    <EuiFormRow data-node-id={node.id}>
      <EuiSwitch
        compressed
        label={node.label}
        checked={state[bind] === true}
        onChange={(event) => change(event.target.checked)}
      />
    </EuiFormRow>
  );
};
