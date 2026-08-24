/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import type { SnakeToCamelCase } from '../../../common/types';
import type { WorkflowOrigin, WorkflowUserAction } from '../../../common/types/domain';
import {
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
  COMMENT_WORKFLOW_ORIGIN_TYPE,
  ATTACHMENT_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/types/domain/user_action/workflow/constants';
import { OBSERVABLE_TYPES_BUILTIN } from '../../../common/constants';
import { WorkflowsManagementUiActions } from '@kbn/workflows';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import type { UserActionBuilder, UserActionBuilderArgs } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import { useAppUrl, useKibana } from '../../common/lib/kibana';
import * as i18n from './translations';
import type { CasesConfigurationUI } from '../../containers/types';

interface WorkflowActivityLabelProps {
  workflow: SnakeToCamelCase<WorkflowUserAction>['payload']['workflow'];
  origin: WorkflowOrigin;
  casesConfiguration: CasesConfigurationUI;
}

const WorkflowActivityLabel: React.FC<WorkflowActivityLabelProps> = ({
  workflow,
  origin,
  casesConfiguration,
}) => {
  const { getAppUrl } = useAppUrl(WORKFLOWS_APP_ID);
  const capabilities = useKibana().services?.application?.capabilities;

  const { id, name, executionId } = workflow;

  // Gate the execution deep link on Workflows view permissions (readWorkflow + readWorkflowExecution).
  const wfCapabilities = capabilities?.workflowsManagement as Record<string, unknown> | undefined;
  const canViewExecution =
    Boolean(wfCapabilities?.[WorkflowsManagementUiActions.read]) &&
    Boolean(wfCapabilities?.[WorkflowsManagementUiActions.readExecution]);

  const executionHref = getAppUrl({
    path: `/${encodeURIComponent(id)}?tab=executions&executionId=${encodeURIComponent(executionId)}`,
  });

  const workflowNameNode = canViewExecution ? (
    <EuiLink data-test-subj="workflow-execution-link" href={executionHref} target="_blank">
      {name}
    </EuiLink>
  ) : (
    <>{name}</>
  );

  const originDescription = (() => {
    switch (origin.type) {
      case CASE_WORKFLOW_ORIGIN_TYPE:
        return i18n.STARTED_WORKFLOW_AGAINST_CASE_LABEL;
      case OBSERVABLE_WORKFLOW_ORIGIN_TYPE: {
        if (origin.typeKey && origin.value) {
          const allObservableTypes = [
            ...OBSERVABLE_TYPES_BUILTIN,
            ...(casesConfiguration?.observableTypes ?? []),
          ];
          const found = allObservableTypes.find((t) => t.key === origin.typeKey);
          const typeLabel = found?.label ?? origin.typeKey;
          return i18n.STARTED_WORKFLOW_AGAINST_OBSERVABLE_LABEL(typeLabel, origin.value);
        }
        return i18n.STARTED_WORKFLOW_AGAINST_OBSERVABLE_FALLBACK_LABEL;
      }
      case ALERT_WORKFLOW_ORIGIN_TYPE:
        return i18n.STARTED_WORKFLOW_AGAINST_ALERT_LABEL;
      case ALERTS_WORKFLOW_ORIGIN_TYPE:
        return i18n.STARTED_WORKFLOW_AGAINST_ALERTS_LABEL;
      case COMMENT_WORKFLOW_ORIGIN_TYPE:
        return i18n.STARTED_WORKFLOW_AGAINST_COMMENT_LABEL;
      case ATTACHMENT_WORKFLOW_ORIGIN_TYPE:
        return i18n.STARTED_WORKFLOW_AGAINST_ATTACHMENT_LABEL;
      default:
        return i18n.STARTED_WORKFLOW_AGAINST_CASE_LABEL;
    }
  })();

  return (
    <EuiText size="s" data-test-subj="workflow-user-action-label">
      {originDescription}&nbsp;with {workflowNameNode}
    </EuiText>
  );
};

export const createWorkflowUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
  casesConfiguration,
  renderWorkflowUserActionAction,
}: UserActionBuilderArgs) => ({
  build: () => {
    const action = userAction as SnakeToCamelCase<WorkflowUserAction>;
    const { workflow, origin } = action.payload;

    const label = (
      <WorkflowActivityLabel
        workflow={workflow}
        origin={origin}
        casesConfiguration={casesConfiguration}
      />
    );

    const extraActions = renderWorkflowUserActionAction?.({
      origin,
      userActionId: userAction.id,
    });

    return createCommonUpdateUserActionBuilder({
      userProfiles,
      userAction,
      handleOutlineComment,
      label,
      icon: 'dot',
      extraActions,
    }).build();
  },
});
