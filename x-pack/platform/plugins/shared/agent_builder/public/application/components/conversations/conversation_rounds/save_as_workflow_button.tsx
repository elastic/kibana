/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiCopy,
} from '@elastic/eui';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common/chat/conversation';

const STEP_TOOL_PREFIX = 'platform.workflows.step.';

interface SaveAsWorkflowButtonProps {
  round: ConversationRound;
  isLoading: boolean;
}

export const SaveAsWorkflowButton: React.FC<SaveAsWorkflowButtonProps> = ({
  round,
  isLoading,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const allSteps = round.steps || [];
  const stepToolCalls = allSteps.filter(
    (s) => isToolCallStep(s) && s.tool_id.startsWith(STEP_TOOL_PREFIX)
  );

  // eslint-disable-next-line no-console
  console.log('[SaveAsWorkflow]', {
    totalSteps: allSteps.length,
    stepToolCalls: stepToolCalls.length,
    isLoading,
    toolIds: allSteps.filter((s) => isToolCallStep(s)).map((s: any) => s.tool_id),
    roundStatus: round.status,
  });

  if (stepToolCalls.length === 0 || isLoading) {
    return null;
  }

  const yaml = generateWorkflowYaml(stepToolCalls);

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="save"
            onClick={() => setIsModalOpen(true)}
          >
            Save as Workflow
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isModalOpen && (
        <EuiModal onClose={() => setIsModalOpen(false)} maxWidth={700}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>Save as Workflow</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s" color="subdued">
              <p>
                This workflow was generated from your conversation. It captures the {stepToolCalls.length} step(s)
                you executed and can be saved as a scheduled automation.
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiCodeBlock language="yaml" isCopyable paddingSize="m" overflowHeight={400}>
              {yaml}
            </EuiCodeBlock>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiCopy textToCopy={yaml}>
              {(copy) => (
                <EuiButton onClick={copy} iconType="copy">
                  Copy YAML
                </EuiButton>
              )}
            </EuiCopy>
            <EuiButton onClick={() => setIsModalOpen(false)}>
              Close
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};

function generateWorkflowYaml(
  stepToolCalls: Array<{ tool_id: string; params?: Record<string, unknown> }>
): string {
  const lines: string[] = [];

  lines.push('name: generated-from-conversation');
  lines.push('description: Workflow generated from Agent Builder conversation');
  lines.push('enabled: true');
  lines.push('');
  lines.push('triggers:');
  lines.push('  - type: manual');
  lines.push('');
  lines.push('steps:');

  stepToolCalls.forEach((step, i) => {
    const stepType = step.tool_id.replace(STEP_TOOL_PREFIX, '');
    const name = `step_${i + 1}_${stepType.replace(/\./g, '_')}`;

    lines.push(`  - name: ${name}`);

    if (stepType.startsWith('elasticsearch.')) {
      lines.push(`    type: elasticsearch.request`);
      const params = step.params || {};
      lines.push('    with:');
      lines.push(`      method: ${params.method || 'POST'}`);
      lines.push(`      path: ${params.path || '/logs-*/_search'}`);
      if (params.body) {
        lines.push(`      body: ${JSON.stringify(params.body)}`);
      }
    } else if (stepType === 'ai.summarize') {
      lines.push(`    type: ai.summarize`);
      lines.push('    with:');
      const params = step.params || {};
      if (params.instructions) {
        lines.push(`      instructions: "${params.instructions}"`);
      }
      if (i > 0) {
        const prevName = `step_${i}_${stepToolCalls[i - 1].tool_id.replace(STEP_TOOL_PREFIX, '').replace(/\./g, '_')}`;
        lines.push(`      input: "\${{ steps.${prevName}.output }}"`);
      }
    } else if (stepType === 'ai.prompt') {
      lines.push(`    type: ai.prompt`);
      lines.push('    with:');
      const params = step.params || {};
      if (params.prompt) {
        const truncated = (params.prompt as string).length > 100
          ? (params.prompt as string).slice(0, 97) + '...'
          : params.prompt;
        lines.push(`      prompt: "${truncated}"`);
      }
    } else if (stepType === 'slack') {
      lines.push(`    type: slack.postMessage`);
      const params = step.params || {};
      const sub = (params.subActionParams || {}) as Record<string, unknown>;
      if (params.connector_id) {
        lines.push(`    connector-id: "${params.connector_id}"`);
      }
      lines.push('    with:');
      if (sub.channels) {
        lines.push(`      channels:`);
        ((sub.channels as string[]) || []).forEach((ch) => {
          lines.push(`        - "${ch}"`);
        });
      }
      if (i > 0) {
        const prevName = `step_${i}_${stepToolCalls[i - 1].tool_id.replace(STEP_TOOL_PREFIX, '').replace(/\./g, '_')}`;
        lines.push(`      text: "\${{ steps.${prevName}.output.content }}"`);
      }
    } else if (stepType === 'data.regex-replace') {
      lines.push(`    type: data.regexReplace`);
      const params = step.params || {};
      lines.push('    with:');
      lines.push(`      pattern: "${params.pattern || ''}"`);
      lines.push(`      replacement: "${params.replacement || ''}"`);
      if (i > 0) {
        const prevName = `step_${i}_${stepToolCalls[i - 1].tool_id.replace(STEP_TOOL_PREFIX, '').replace(/\./g, '_')}`;
        lines.push(`    source: "\${{ steps.${prevName}.output }}"`);
      }
    } else {
      lines.push(`    type: ${stepType}`);
      if (step.params) {
        lines.push('    with:');
        Object.entries(step.params).forEach(([k, v]) => {
          if (k !== 'connector_id') {
            const val = typeof v === 'string' ? `"${v.slice(0, 100)}"` : JSON.stringify(v);
            lines.push(`      ${k}: ${val}`);
          }
        });
      }
    }

    lines.push('');
  });

  return lines.join('\n');
}
