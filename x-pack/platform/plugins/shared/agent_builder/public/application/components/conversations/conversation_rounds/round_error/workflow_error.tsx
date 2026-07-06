/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { borderRadiusXlStyles } from '../../../../../common.styles';

interface WorkflowErrorError {
  message: string;
  meta?: { workflow?: string };
}

export interface WorkflowErrorProps {
  title: string;
  description: { id: string; defaultMessage: string };
  error: WorkflowErrorError;
}

export const WorkflowError: React.FC<WorkflowErrorProps> = ({ title, description, error }) => {
  const workflowName = error.meta?.workflow ?? 'unknown';
  const message = error.message;

  return (
    <EuiCallOut
      color="danger"
      title={title}
      iconType="error"
      css={borderRadiusXlStyles}
      data-test-subj={'agentBuilderErrorWorkflow'}
    >
      <EuiText size="s">
        <FormattedMessage
          id={description.id}
          defaultMessage={description.defaultMessage}
          values={{ workflow: workflowName, message }}
        />
      </EuiText>
    </EuiCallOut>
  );
};
