/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import React from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { getWorkflowExecutionPath } from '../../../utils/get_workflow_execution_path';
import { WorkflowLastExecution } from '../workflow_last_execution';

const lastRunLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.runs.lastRun', {
  defaultMessage: 'Last run',
});

export interface DreamingLastRunStatusProps {
  workflowIds: readonly string[];
  execution: Pick<WorkflowExecutionListItemDto, 'id' | 'status' | 'startedAt'> | null | undefined;
  workflowId: string | undefined;
}

export const DreamingLastRunStatus = ({
  workflowIds,
  execution,
  workflowId,
}: DreamingLastRunStatusProps) => {
  const {
    services: { application },
  } = useKibana();

  if (workflowIds.length === 0 || execution === undefined || execution === null) {
    return (
      <WorkflowLastExecution hasExecution={false} data-test-subj="contextAiIndexDreamingLastRun" />
    );
  }

  const lastRunHref = application.getUrlForApp(WORKFLOWS_APP_ID, {
    path: getWorkflowExecutionPath(workflowId ?? workflowIds[0], execution.id),
  });

  return (
    <WorkflowLastExecution
      hasExecution
      label={lastRunLabel}
      status={execution.status}
      startedAt={execution.startedAt}
      href={lastRunHref}
      data-test-subj="contextAiIndexDreamingLastRun"
    />
  );
};
