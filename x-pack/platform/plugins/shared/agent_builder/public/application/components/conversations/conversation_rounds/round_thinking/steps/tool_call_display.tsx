/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import { isInternalTool } from '@kbn/agent-builder-common/tools';
import type { ReactNode } from 'react';
import React from 'react';
import { EuiLink, EuiText, EuiCode, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { appPaths } from '../../../../../utils/app_paths';
import { ThinkingItemLayout } from './thinking_item_layout';

const STEP_TOOL_PREFIX = 'platform.workflows.step.';

const labels = {
  toolCall: i18n.translate('xpack.agentBuilder.thinking.toolCallLabel', {
    defaultMessage: 'Tool call',
  }),
  toolLink: i18n.translate('xpack.agentBuilder.thinking.toolLinkLabel', {
    defaultMessage: 'View tool details',
  }),
};

interface ToolCallDisplayProps {
  step: ToolCallStep;
  icon?: ReactNode;
  textColor?: string;
}

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ step, icon, textColor }) => {
  const { tool_id: toolId } = step;
  const { createAgentBuilderUrl } = useNavigation();
  const toolHref = createAgentBuilderUrl(appPaths.tools.details({ toolId }));
  const toolLinkId = `tool-link-${toolId}`;
  const { euiTheme } = useEuiTheme();

  if (toolId.startsWith(STEP_TOOL_PREFIX)) {
    const stepName = toolId.replace(STEP_TOOL_PREFIX, '');
    const paramsStr = step.params ? formatStepParams(stepName, step.params) : '';

    return (
      <ThinkingItemLayout icon={icon} textColor={textColor}>
        <code
          css={css`
            font-size: 13px;
          `}
        >
          <strong
            css={css`
              color: ${euiTheme.colors.successText};
            `}
          >
            {'$ '}
            {stepName}
          </strong>
          {paramsStr ? ` ${paramsStr}` : ''}
        </code>
      </ThinkingItemLayout>
    );
  }

  return (
    <ThinkingItemLayout icon={icon} accordionContent={step.params} textColor={textColor}>
      <EuiText size="s">
        <p role="status" aria-label={labels.toolCall}>
          <FormattedMessage
            id="xpack.agentBuilder.thinking.toolCallThinkingItem"
            defaultMessage="Calling tool {tool}"
            values={{
              tool: isInternalTool(toolId) ? (
                <EuiCode>{toolId}</EuiCode>
              ) : (
                <code>
                  <EuiLink
                    href={toolHref}
                    target="_blank"
                    id={toolLinkId}
                    aria-label={`${labels.toolLink} ${toolId}`}
                    rel="noopener noreferrer"
                  >
                    {toolId}
                  </EuiLink>
                </code>
              ),
            }}
          />
        </p>
      </EuiText>
    </ThinkingItemLayout>
  );
};

function formatStepParams(stepName: string, params: Record<string, unknown>): string {
  if (stepName.startsWith('elasticsearch.')) {
    const method = (params.method as string) || 'GET';
    const path = (params.path as string) || '';
    const hasBody = params.body && Object.keys(params.body as object).length > 0;
    return `${method} ${path}${hasBody ? ' --body {...}' : ''}`;
  }
  if (stepName === 'ai.prompt') {
    const prompt = (params.prompt as string) || '';
    const truncated = prompt.length > 80 ? prompt.slice(0, 77) + '...' : prompt;
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
  return '';
}
