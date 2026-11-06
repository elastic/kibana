/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { Action } from '@kbn/custom-app-common';
import { useAppRuntime, useStateValues } from '../runtime/app_runtime_context';

const NO_LIST: readonly string[] = [];

/**
 * What an input that sets a list shares: it shows the list of the key it is bound to, and a change
 * writes the new list there and then runs the node's own actions, with the list as their input.
 */
export const useBoundList = ({
  bind,
  onChange,
}: {
  bind: string;
  onChange: readonly Action[];
}): { list: readonly string[]; change: (next: string[]) => void } => {
  const runtime = useAppRuntime();
  const state = useStateValues();
  const value = state[bind];

  const change = useCallback(
    (next: string[]) => {
      runtime.run([{ type: 'setState', key: bind, value: { fromInput: true } }, ...onChange], {
        input: next,
      });
    },
    [runtime, bind, onChange]
  );

  return { list: Array.isArray(value) ? (value as readonly string[]) : NO_LIST, change };
};
