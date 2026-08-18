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
import { useAppUrl } from '../../common/lib/kibana';
import { createCommonUpdateUserActionBuilder } from './common';
import type { UserActionBuilder } from './types';

type WorkflowActivity = SnakeToCamelCase<WorkflowUserAction>['payload'];

const WorkflowActivityLabel: React.FC<WorkflowActivity> = ({ workflow, origin }) => {
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
}) => ({
  build: () => {
    const workflowUserAction = userAction as SnakeToCamelCase<WorkflowUserAction>;

    return createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label: <WorkflowActivityLabel {...workflowUserAction.payload} />,
      icon: 'dot',
    }).build();
  },
});
