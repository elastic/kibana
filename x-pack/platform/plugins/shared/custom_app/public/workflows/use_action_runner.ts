/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { Action } from '@kbn/custom-app-common';
import type { ActionInput } from '../runtime/app_runtime';
import { useAppRuntime } from '../runtime/app_runtime_context';
import { useWorkflowRunner } from './workflow_runner';

/**
 * Runs the actions of a component. What changes the app happens at once; a workflow an action asks
 * for is put to the user first. Returns what could not be applied, with the reason.
 */
export const useActionRunner = (nodeId: string) => {
  const runtime = useAppRuntime();
  const runner = useWorkflowRunner();

  return useCallback(
    (actions: readonly Action[], input?: ActionInput): string[] => {
      const { dropped, workflows } = runtime.run(actions, input);
      if (workflows.length > 0) runner.request(workflows, nodeId);
      return dropped;
    },
    [runtime, runner, nodeId]
  );
};
