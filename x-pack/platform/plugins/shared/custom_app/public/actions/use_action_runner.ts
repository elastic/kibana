/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useActionUis } from '@kbn/custom-app-registry';
import type { Action } from '@kbn/custom-app-common';
import type { ActionInput } from '../runtime/app_runtime';
import { useAppRuntime } from '../runtime/app_runtime_context';

/**
 * Runs the actions of a component. What changes the app happens at once; what an action asks the
 * app to do, such as a workflow, is put to the person first by the part of the action that is
 * drawn. Returns what could not be applied, with the reason.
 */
export const useActionRunner = (nodeId: string) => {
  const runtime = useAppRuntime();
  const uis = useActionUis();

  return useCallback(
    (actions: readonly Action[], input?: ActionInput): string[] => {
      const { dropped, requests } = runtime.run(actions, input);
      const byAction = new Map<string, unknown[]>();
      requests.forEach(({ action, payload }) =>
        byAction.set(action, [...(byAction.get(action) ?? []), payload])
      );
      byAction.forEach((payloads, action) => uis[action]?.request(payloads, nodeId));
      return dropped;
    },
    [runtime, uis, nodeId]
  );
};
