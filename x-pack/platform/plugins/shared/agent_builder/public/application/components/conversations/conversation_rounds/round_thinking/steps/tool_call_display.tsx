/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import type { ReactNode } from 'react';
import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { appPaths } from '../../../../../utils/app_paths';
import { ThinkingItemLayout } from './thinking_item_layout';

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

  return (
    <ThinkingItemLayout icon={icon} accordionContent={step.params} textColor={textColor}>
      <EuiText size="s">
        <p role="status" aria-label={labels.toolCall}>
          <FormattedMessage
            id="xpack.agentBuilder.thinking.toolCallThinkingItem"
            defaultMessage="Calling tool {tool}"
            values={{
              tool: (
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
