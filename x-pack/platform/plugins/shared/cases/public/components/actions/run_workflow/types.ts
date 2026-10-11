/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunWorkflowExecutor, RunWorkflowPanelProps } from '@kbn/workflows-ui';

/** Props passed directly to `RunCaseWorkflowModal` from the action hook. */
export interface RunCaseWorkflowModalProps
  extends Pick<
    RunWorkflowPanelProps,
    'inputs' | 'sortWorkflow' | 'filterWorkflow' | 'onExecutionSettled'
  > {
  runWorkflow: RunWorkflowExecutor;
  onClose: () => void;
  focusButtonRef?: React.Ref<HTMLButtonElement | HTMLAnchorElement>;
}
