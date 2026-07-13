/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface WorkflowYamlPreviewProps {
  yaml?: string;
  isLoading?: boolean;
  error?: string;
}

/**
 * Read-only, syntax-highlighted view of the workflow YAML that the server would
 * generate for the current experiment form. Used by the "Show workflow YAML" toggle.
 */
export const WorkflowYamlPreview: React.FC<WorkflowYamlPreviewProps> = ({
  yaml,
  isLoading,
  error,
}) => {
  if (error) {
    return (
      <EuiCallOut
        announceOnMount
        color="danger"
        iconType="alert"
        size="s"
        data-test-subj="evalsWorkflowYamlPreviewError"
      >
        <p>{error}</p>
      </EuiCallOut>
    );
  }

  if (isLoading) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.evals.workflowYamlPreview.loading', {
              defaultMessage: 'Generating workflow YAML…',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!yaml) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.evals.workflowYamlPreview.empty', {
          defaultMessage: 'Complete the form to preview the generated workflow YAML.',
        })}
      </EuiText>
    );
  }

  return (
    <EuiCodeBlock
      language="yaml"
      fontSize="s"
      paddingSize="m"
      isCopyable
      overflowHeight={400}
      data-test-subj="evalsWorkflowYamlPreview"
    >
      {yaml}
    </EuiCodeBlock>
  );
};
