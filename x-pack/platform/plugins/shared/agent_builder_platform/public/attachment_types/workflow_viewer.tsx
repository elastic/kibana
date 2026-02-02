/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import { parse } from 'yaml';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiLoadingSpinner,
} from '@elastic/eui';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { WorkflowYaml } from '@kbn/workflows';
import type { WorkflowAttachmentData } from '../../server/attachment_types/workflow';

// Lazy-load the WorkflowVisualEditor to avoid circular dependencies
const WorkflowVisualEditorLazy = React.lazy(() =>
  import('@kbn/workflows-management-plugin/public').then((module) => ({
    default: module.WorkflowVisualEditor,
  }))
);

interface WorkflowViewerProps {
  attachment: Attachment<string, WorkflowAttachmentData>;
}

/**
 * React component for rendering workflow attachments.
 * Displays workflow information and a visual preview using WorkflowVisualEditor.
 */
export const WorkflowViewer: React.FC<WorkflowViewerProps> = ({ attachment }) => {
  const { workflowId, name, description, enabled, yaml, executionId } = attachment.data;

  // Parse the YAML to get the workflow definition for visualization
  const parsedWorkflow = useMemo<WorkflowYaml | null>(() => {
    if (!yaml) return null;
    try {
      return parse(yaml) as WorkflowYaml;
    } catch {
      return null;
    }
  }, [yaml]);

  return (
    <EuiPanel paddingSize="m" hasBorder data-test-subj="workflowViewer">
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiBadge color={enabled ? 'success' : 'default'} iconType="pipelineApp">
            {enabled ? 'Enabled' : 'Disabled'}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>{name}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <code>{workflowId}</code>
      </EuiText>

      {description && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>{description}</p>
          </EuiText>
        </>
      )}

      {executionId && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut size="s" color="primary" iconType="clock" title="Recent Execution">
            <EuiText size="xs">
              Execution ID: <code>{executionId}</code>
            </EuiText>
          </EuiCallOut>
        </>
      )}

      {parsedWorkflow && (
        <>
          <EuiSpacer size="m" />
          <div style={{ height: 300 }}>
            <Suspense
              fallback={
                <EuiFlexGroup
                  justifyContent="center"
                  alignItems="center"
                  style={{ height: '100%' }}
                >
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="xl" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
            >
              <WorkflowVisualEditorLazy workflow={parsedWorkflow} />
            </Suspense>
          </div>
        </>
      )}

      {!parsedWorkflow && yaml && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            size="s"
            color="warning"
            iconType="warning"
            title="Could not parse workflow definition"
          />
        </>
      )}
    </EuiPanel>
  );
};
