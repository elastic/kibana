/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { Action } from '@kbn/custom-app-common';
import { useWorkflowRunner } from './workflow_runner';

/**
 * Why what a component does cannot be done yet, when it runs a workflow: the person may not run
 * workflows, or a workflow it names is not saved, which is how an app made with a draft starts
 * out. Without a reason it can be used. A component that runs no workflow is never held back.
 */
export const useWorkflowsGate = (actions: readonly Action[]): string | undefined => {
  const { availability, statuses, track } = useWorkflowRunner();
  const ids = useMemo(
    () => actions.flatMap((action) => (action.type === 'runWorkflow' ? [action.workflow] : [])),
    [actions]
  );

  useEffect(() => {
    if (availability.canRun) track(ids);
  }, [availability.canRun, ids, track]);

  if (ids.length === 0) return undefined;
  if (!availability.canRun) return availability.reason;

  const missing = ids.find((id) => id !== '' && statuses[id] === 'missing');
  return missing === undefined
    ? undefined
    : i18n.translate('xpack.customApp.workflows.notSaved', {
        defaultMessage:
          'The workflow "{workflow}" has not been saved yet. Save it in the Workflows application and this will work.',
        values: { workflow: missing },
      });
};
