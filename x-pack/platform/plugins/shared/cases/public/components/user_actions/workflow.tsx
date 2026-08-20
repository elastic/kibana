/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { SnakeToCamelCase } from '../../../common/types';
import type { WorkflowUserAction } from '../../../common/types/domain';
import { OBSERVABLE_TYPES_BUILTIN } from '../../../common/constants';
import { useAppUrl } from '../../common/lib/kibana';
import { createCommonUpdateUserActionBuilder } from './common';
import type { UserActionBuilder } from './types';

type WorkflowActivity = SnakeToCamelCase<WorkflowUserAction>['payload'];

interface WorkflowActivityLabelProps extends WorkflowActivity {
  observableTypeLabel?: string;
}

const WorkflowActivityLabel: React.FC<WorkflowActivityLabelProps> = ({
  workflow,
  origin,
  observableTypeLabel,
}) => {
  const { id, name, executionId } = workflow;
  const { getAppUrl } = useAppUrl(WORKFLOWS_APP_ID);
  const executionUrl = getAppUrl({
    path: `/${encodeURIComponent(id)}?tab=executions&executionId=${encodeURIComponent(
      executionId
    )}`,
  });
  const link = (chunks: React.ReactNode) => (
    <EuiLink data-test-subj="workflow-execution-link" href={executionUrl} target="_blank">
      {chunks}
    </EuiLink>
  );

  switch (origin.type) {
    case 'cases.case':
      return (
        <FormattedMessage
          id="xpack.cases.caseView.userActions.startedWorkflowAgainstCaseLabel"
          defaultMessage="started workflow <link>{name}</link> against the case"
          values={{ name, link }}
        />
      );
    case 'cases.observable':
      if (origin.typeKey != null && origin.value != null) {
        return (
          <FormattedMessage
            id="xpack.cases.caseView.userActions.startedWorkflowAgainstObservableDetailsLabel"
            defaultMessage="started workflow <link>{name}</link> against observable <strong>{typeKey}: {value}</strong>"
            values={{
              name,
              typeKey: observableTypeLabel ?? origin.typeKey,
              value: origin.value,
              link,
              strong: (chunks) => <strong>{chunks}</strong>,
            }}
          />
        );
      }
      return (
        <FormattedMessage
          id="xpack.cases.caseView.userActions.startedWorkflowAgainstObservableLabel"
          defaultMessage="started workflow <link>{name}</link> against an observable"
          values={{ name, link }}
        />
      );
    case 'cases.alert':
      return (
        <FormattedMessage
          id="xpack.cases.caseView.userActions.startedWorkflowAgainstAlertLabel"
          defaultMessage="started workflow <link>{name}</link> against an alert"
          values={{ name, link }}
        />
      );
    case 'cases.alerts':
      return (
        <FormattedMessage
          id="xpack.cases.caseView.userActions.startedWorkflowAgainstAlertsLabel"
          defaultMessage="started workflow <link>{name}</link> against the alerts"
          values={{ name, link }}
        />
      );
    case 'cases.comment':
      return (
        <FormattedMessage
          id="xpack.cases.caseView.userActions.startedWorkflowAgainstCommentLabel"
          defaultMessage="started workflow <link>{name}</link> against a comment"
          values={{ name, link }}
        />
      );
    case 'cases.attachment':
      return (
        <FormattedMessage
          id="xpack.cases.caseView.userActions.startedWorkflowAgainstAttachmentLabel"
          defaultMessage="started workflow <link>{name}</link> against an attachment"
          values={{ name, link }}
        />
      );
  }
};
WorkflowActivityLabel.displayName = 'WorkflowActivityLabel';

export const createWorkflowUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
  renderWorkflowUserActionAction,
  casesConfiguration,
}) => ({
  build: () => {
    const workflowUserAction = userAction as SnakeToCamelCase<WorkflowUserAction>;
    const { origin } = workflowUserAction.payload;
    const observableTypeLabel =
      origin.type === 'cases.observable' && origin.typeKey != null
        ? [...OBSERVABLE_TYPES_BUILTIN, ...casesConfiguration.observableTypes].find(
            ({ key }) => key === origin.typeKey
          )?.label
        : undefined;
    const activityAction = renderWorkflowUserActionAction?.({
      origin,
      userActionId: userAction.id,
    });

    return createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label: (
        <WorkflowActivityLabel
          {...workflowUserAction.payload}
          observableTypeLabel={observableTypeLabel}
        />
      ),
      icon: 'dot',
      extraActions: activityAction,
    }).build();
  },
});
