/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import React from 'react';
import { useWorkflow } from '../../hooks/use_workflow';

const READ_ONLY_OPTIONS = {
  readOnly: true,
  domReadOnly: true,
  minimap: { enabled: false },
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  fontSize: 14,
} as const;

export interface WorkflowYamlPreviewFlyoutProps {
  workflowId: string;
  workflowName: string;
  onClose: () => void;
}

export const WorkflowYamlPreviewFlyout = ({
  workflowId,
  workflowName,
  onClose,
}: WorkflowYamlPreviewFlyoutProps) => {
  const { data: workflow, isLoading, error } = useWorkflow(workflowId, true);

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby="contextWorkflowYamlPreviewFlyoutTitle"
      data-test-subj="contextWorkflowYamlPreviewFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" id="contextWorkflowYamlPreviewFlyoutTitle">
          <h2>
            {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.previewFlyoutTitle', {
              defaultMessage: 'Workflow preview: {name}',
              values: { name: workflowName },
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isLoading ? (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" data-test-subj="contextWorkflowYamlPreviewLoading" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
        {error ? (
          <KbnDangerCallout
            announceOnMount
            title={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.automations.previewFlyoutErrorTitle',
              { defaultMessage: 'Unable to load workflow' }
            )}
            data-test-subj="contextWorkflowYamlPreviewError"
          >
            {error instanceof Error
              ? error.message
              : i18n.translate(
                  'xpack.contextEngine.aiIndexDetail.automations.previewFlyoutErrorBody',
                  { defaultMessage: 'Try again later.' }
                )}
          </KbnDangerCallout>
        ) : null}
        {workflow?.yaml ? (
          <div style={{ height: '60vh' }}>
            <CodeEditor
              languageId="yaml"
              value={workflow.yaml}
              height="100%"
              options={READ_ONLY_OPTIONS}
              isCopyable
              allowFullScreen
              data-test-subj="contextWorkflowYamlPreview"
            />
          </div>
        ) : null}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
