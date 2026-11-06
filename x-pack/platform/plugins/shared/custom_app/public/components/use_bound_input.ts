/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { Action } from '@kbn/custom-app-common';
import { useAppRuntime, useStateValues } from '../runtime/app_runtime_context';

/**
 * What every input shares: it shows the state key it is bound to, and a change writes the new
 * value to that key and then runs the node's own actions with the value as their input.
 */
export const useBoundInput = ({
  bind,
  onChange,
}: {
  bind: string;
  onChange: readonly Action[];
}): { value: string; change: (next: string) => void } => {
  const runtime = useAppRuntime();
  const state = useStateValues();

  const change = useCallback(
    (next: string) => {
      runtime.run([{ type: 'setState', key: bind, value: { fromInput: true } }, ...onChange], {
        input: next,
      });
    },
    [runtime, bind, onChange]
  );

  return { value: String(state[bind] ?? ''), change };
};
