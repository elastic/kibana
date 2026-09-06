/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { WorkflowsManagementUiActions } from '@kbn/workflows';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import type { SnakeToCamelCase } from '../../../common/types';
import type { WorkflowOrigin, WorkflowUserAction } from '../../../common/types/domain';
import {
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/types/domain/user_action/workflow/constants';
import { OBSERVABLE_TYPES_BUILTIN } from '../../../common/constants';
import type { UserActionBuilder, UserActionBuilderArgs } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import { useAppUrl, useKibana } from '../../common/lib/kibana';
import type { CasesConfigurationUI } from '../../containers/types';

interface WorkflowActivityLabelProps {
  workflow: SnakeToCamelCase<WorkflowUserAction>['payload']['workflow'];
  origin?: WorkflowOrigin;
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
  // Type off the enum so we don't need @kbn/workflows-ui (which would grow the bundle).
  const wfCapabilities = capabilities?.workflowsManagement as
    | Partial<Record<WorkflowsManagementUiActions, boolean>>
    | undefined;
  const canViewExecution =
    Boolean(wfCapabilities?.[WorkflowsManagementUiActions.read]) &&
    Boolean(wfCapabilities?.[WorkflowsManagementUiActions.readExecution]);

  const executionHref = getAppUrl({
    path: `/${encodeURIComponent(id)}?tab=executions&executionId=${encodeURIComponent(
      executionId
    )}`,
  });

  const workflowNameNode = canViewExecution ? (
    <EuiLink data-test-subj="workflow-execution-link" href={executionHref} target="_blank">
      {name}
    </EuiLink>
  ) : (
    <>{name}</>
  );

  const label = (() => {
    switch (origin?.type) {
      case OBSERVABLE_WORKFLOW_ORIGIN_TYPE: {
        if (origin.typeKey && origin.value) {
          const allObservableTypes = [
            ...OBSERVABLE_TYPES_BUILTIN,
            ...(casesConfiguration?.observableTypes ?? []),
          ];
          const found = allObservableTypes.find((t) => t.key === origin.typeKey);
          const typeLabel = found?.label ?? origin.typeKey;
          const observableNode = (
            <EuiBadge color="hollow" data-test-subj="workflow-observable-badge">
              {`${typeLabel}: ${origin.value}`}
            </EuiBadge>
          );
          return (
            <FormattedMessage
              id="xpack.cases.caseView.userActions.ranWorkflowOnObservableDetailsLabel"
              defaultMessage="ran {name} on observable {observable}"
              values={{ name: workflowNameNode, observable: observableNode }}
            />
          );
        }
        return (
          <FormattedMessage
            id="xpack.cases.caseView.userActions.ranWorkflowOnObservableLabel"
            defaultMessage="ran {name} on an observable"
            values={{ name: workflowNameNode }}
          />
        );
      }
      case ALERT_WORKFLOW_ORIGIN_TYPE:
        return (
          <FormattedMessage
            id="xpack.cases.caseView.userActions.ranWorkflowOnAlertLabel"
            defaultMessage="ran {name} on an alert"
            values={{ name: workflowNameNode }}
          />
        );
      case OBSERVABLES_WORKFLOW_ORIGIN_TYPE: {
        const count = origin.count;
        if (count !== undefined) {
          return (
            <FormattedMessage
              id="xpack.cases.caseView.userActions.ranWorkflowOnObservablesCountLabel"
              defaultMessage="ran {name} on {count, plural, one {# observable} other {# observables}}"
              values={{ name: workflowNameNode, count }}
            />
          );
        }
        return (
          <FormattedMessage
            id="xpack.cases.caseView.userActions.ranWorkflowOnObservablesLabel"
            defaultMessage="ran {name} on observables"
            values={{ name: workflowNameNode }}
          />
        );
      }
      case ALERTS_WORKFLOW_ORIGIN_TYPE:
        return (
          <FormattedMessage
            id="xpack.cases.caseView.userActions.ranWorkflowOnAlertsLabel"
            defaultMessage="ran {name} on alerts"
            values={{ name: workflowNameNode }}
          />
        );
      case CASE_WORKFLOW_ORIGIN_TYPE:
      default:
        return (
          <FormattedMessage
            id="xpack.cases.caseView.userActions.ranWorkflowOnCaseLabel"
            defaultMessage="ran {name} on this case"
            values={{ name: workflowNameNode }}
          />
        );
    }
  })();

  return (
    <EuiText size="s" data-test-subj="workflow-user-action-label">
      {label}
    </EuiText>
  );
};

WorkflowActivityLabel.displayName = 'WorkflowActivityLabel';

export const createWorkflowUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
  casesConfiguration,
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

    return createCommonUpdateUserActionBuilder({
      userProfiles,
      userAction,
      handleOutlineComment,
      label,
      icon: 'workflow',
    }).build();
  },
});
