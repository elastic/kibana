/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCallStep } from '@kbn/onechat-common/chat/conversation';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import type { ReactNode } from 'react';
import React from 'react';
import { EuiCode, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ThinkingItemLayout } from './thinking_item_layout';

const labels = {
  toolResponse: i18n.translate('xpack.onechat.thinking.toolResponseLabel', {
    defaultMessage: 'Tool response',
  }),
  inspectResponse: i18n.translate('xpack.onechat.thinking.inspectResponseLabel', {
    defaultMessage: 'Inspect tool response details',
  }),
};

interface FlyoutResultItemProps {
  step: ToolCallStep;
  stepIndex: number;
  flyoutResultItems: ToolResult[];
  onOpenFlyout: (results: ToolResult[]) => void;
  icon?: ReactNode;
}

export const FlyoutResultItem: React.FC<FlyoutResultItemProps> = ({
  step,
  stepIndex,
  flyoutResultItems,
  onOpenFlyout,
  icon,
}) => {
  const responseId = `tool-response-${stepIndex}-${step.tool_id}`;
  const inspectButtonId = `inspect-response-${stepIndex}-${step.tool_id}`;

  return (
    <ThinkingItemLayout icon={icon}>
      <EuiText size="s">
        <p id={responseId} role="status" aria-label={labels.toolResponse}>
          <FormattedMessage
            id="xpack.onechat.thinking.toolCallThinkingItem"
            defaultMessage="Tool {tool} returned response. {inspectResponse}"
            values={{
              tool: (
                <EuiCode
                  aria-label={i18n.translate('xpack.onechat.thinking.toolName', {
                    defaultMessage: 'Tool {toolId}',
                    values: { toolId: step.tool_id },
                  })}
                >
                  {step.tool_id}
                </EuiCode>
              ),
              inspectResponse: (
                <EuiLink
                  onClick={() => onOpenFlyout(flyoutResultItems)}
                  id={inspectButtonId}
                  aria-describedby={responseId}
                  aria-label={labels.inspectResponse}
                  role="button"
                >
                  {i18n.translate('xpack.onechat.conversation.roundResultsButton', {
                    defaultMessage: 'Inspect response',
                  })}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    </ThinkingItemLayout>
  );
};
