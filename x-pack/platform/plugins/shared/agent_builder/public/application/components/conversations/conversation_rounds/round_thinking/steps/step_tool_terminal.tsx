/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import type { ReactNode } from 'react';
import React from 'react';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';

const STEP_TOOL_PREFIX = 'platform.workflows.step.';

interface StepToolTerminalProps {
  step: ToolCallStep;
  icon?: ReactNode;
}

export const StepToolTerminal: React.FC<StepToolTerminalProps> = ({ step, icon }) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'stepTerminal' });

  const stepName = step.tool_id.replace(STEP_TOOL_PREFIX, '');
  const paramsStr = formatStepParams(stepName, step.params);
  const commandLine = `${stepName} ${paramsStr}`.trim();

  const progressLines = (step.progression || []).map((p) => p.message);
  const hasOutput = progressLines.length > 0;

  const titleContent = (
    <code
      css={css`
        font-size: 13px;
        line-height: 1.4;
      `}
    >
      <span
        css={css`
          color: ${euiTheme.colors.successText};
          font-weight: 700;
        `}
      >
        {'$ '}
      </span>
      <span
        css={css`
          font-weight: 600;
        `}
      >
        {commandLine}
      </span>
    </code>
  );

  return (
    <EuiFlexGroup direction="row" gutterSize="m" responsive={false}>
      {icon && (
        <EuiFlexItem
          grow={false}
          css={css`
            padding-top: ${euiTheme.size.xs};
          `}
        >
          {icon}
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiAccordion
          id={accordionId}
          arrowDisplay="right"
          buttonContent={titleContent}
          initialIsOpen={false}
        >
          <EuiPanel
            color="subdued"
            paddingSize="m"
            css={css`
              margin-top: ${euiTheme.size.s};
              border-left: 3px solid ${euiTheme.colors.successText};
            `}
          >
            {step.params && Object.keys(step.params).length > 0 && (
              <>
                <EuiText size="xs" color="subdued">
                  <strong>Input</strong>
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiCodeBlock
                  language="json"
                  fontSize="s"
                  paddingSize="s"
                  isCopyable
                  overflowHeight={200}
                >
                  {JSON.stringify(step.params, null, 2)}
                </EuiCodeBlock>
              </>
            )}
            {step.results.length > 0 && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued">
                  <strong>Output</strong>{' '}
                  <span>{formatResultSummary(stepName, step.results)}</span>
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiCodeBlock
                  language="json"
                  fontSize="s"
                  paddingSize="s"
                  isCopyable
                  overflowHeight={300}
                >
                  {formatResultOutput(step.results)}
                </EuiCodeBlock>
              </>
            )}
            {hasOutput && progressLines.length > 0 && (
              <div
                css={css`
                  margin-top: ${euiTheme.size.s};
                  font-family: ${euiTheme.font.familyCode};
                  font-size: 12px;
                  color: ${euiTheme.colors.textSubdued};
                `}
              >
                {progressLines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
          </EuiPanel>
        </EuiAccordion>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export function formatStepParams(stepName: string, params?: Record<string, unknown>): string {
  if (!params) return '';
  if (stepName === 'elasticsearch.search' && params.query) {
    const query = params.query as string;
    const path = (params.path as string) || '';
    const truncated = query.length > 60 ? query.slice(0, 57) + '...' : query;
    return `${path} "${truncated}"`;
  }
  if (stepName.startsWith('elasticsearch.')) {
    const method = (params.method as string) || 'GET';
    const path = (params.path as string) || '';
    const hasBody = params.body && Object.keys(params.body as object).length > 0;
    return `${method} ${path}${hasBody ? ' --body {...}' : ''}`;
  }
  if (stepName === 'ai.prompt') {
    const prompt = (params.prompt as string) || '';
    const truncated = prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt;
    return `"${truncated}"`;
  }
  if (stepName === 'ai.summarize') {
    const text = (params?.input as string) || '';
    const truncated = text.length > 60 ? text.slice(0, 57) + '...' : text;
    return `"${truncated}"`;
  }
  if (stepName === 'data.regex-replace') {
    const pattern = (params.pattern as string) || '';
    return `--pattern '${pattern}'`;
  }
  if (stepName === 'slack') {
    const sub = (params.subActionParams as Record<string, unknown>) || {};
    const channels = (sub.channels as string[]) || [];
    return channels.length > 0 ? `--channel ${channels[0]}` : '';
  }
  if (stepName === 'http') {
    const method = (params.method as string) || 'post';
    const url = (params.url as string) || '';
    return `${method.toUpperCase()} ${url}`;
  }
  // eslint-disable-next-line no-console
  if (stepName === 'connector-step') console.log('[step-terminal] connector-step params:', JSON.stringify(params));
  if (stepName === 'connector-step') {
    const action = (params.action as string) || '';
    const cId = (params.connectorId as string) || '';
    const connectorType = action.includes('.') ? action.split('.')[0] : '';
    const subAction = action.includes('.') ? action.split('.').slice(1).join('.') : action;
    const shortId = cId.length > 8 ? cId.slice(0, 8) + '…' : cId;
    return connectorType
      ? `${connectorType}.${subAction} (${shortId})`
      : `${action} (${shortId})`;
  }
  return '';
}

function formatResultSummary(
  stepName: string,
  results: Array<{ type: string; data?: Record<string, unknown> }>
): string {
  const first = results[0];
  if (!first?.data) return 'done';

  if (first.data.error) return `error: ${String(first.data.error).slice(0, 100)}`;

  if (first.data.output && typeof first.data.output === 'object') {
    const out = first.data.output as Record<string, unknown>;
    if (stepName.startsWith('elasticsearch.')) {
      const hits = (out.hits as Record<string, unknown>)?.total;
      const total = typeof hits === 'object' ? (hits as Record<string, unknown>).value : hits;
      return `${total ?? '?'} hits returned`;
    }
    if (out.content && typeof out.content === 'string') {
      return `${(out.content as string).length} chars output`;
    }
  }

  return 'done';
}

function formatResultOutput(
  results: Array<{ type: string; data?: Record<string, unknown> }>
): string {
  const first = results[0];
  if (!first?.data) return '{}';

  if (first.data.error) return JSON.stringify({ error: first.data.error }, null, 2);

  if (first.data.output !== undefined) {
    return JSON.stringify(first.data.output, null, 2);
  }

  return JSON.stringify(first.data, null, 2);
}

export const isStepToolCall = (toolId: string): boolean => toolId.startsWith(STEP_TOOL_PREFIX);
