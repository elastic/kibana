/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { AgentBuilderWorkflowAbortedError } from '@kbn/agent-builder-common';
import { borderRadiusXlStyles } from '../../../../../common.styles';

interface WorkflowAbortedRoundErrorProps {
  error: AgentBuilderWorkflowAbortedError;
}

const title = i18n.translate('xpack.agentBuilder.round.error.workflowAborted.title', {
  defaultMessage: 'Workflow aborted',
});

export const WorkflowAbortedRoundError: React.FC<WorkflowAbortedRoundErrorProps> = ({ error }) => {
  const workflowName = error.meta?.workflow;
  const message = error.message;

  return (
    <EuiCallOut
      color="danger"
      title={title}
      iconType="error"
      css={borderRadiusXlStyles}
      data-test-subj="agentBuilderRoundErrorWorkflowAborted"
    >
      {workflowName ? (
        <FormattedMessage
          id="xpack.agentBuilder.round.error.workflowAborted.descriptionWithWorkflow"
          defaultMessage='The workflow "{workflowName}" aborted this run: {message}'
          values={{ workflowName, message }}
        />
      ) : (
        <FormattedMessage
          id="xpack.agentBuilder.round.error.workflowAborted.description"
          defaultMessage="Execution was aborted by a workflow: {message}"
          values={{ message }}
        />
      )}
    </EuiCallOut>
  );
};
