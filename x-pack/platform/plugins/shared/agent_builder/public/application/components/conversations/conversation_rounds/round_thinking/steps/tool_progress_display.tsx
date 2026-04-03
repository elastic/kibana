/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCallProgress } from '@kbn/agent-builder-common/chat/conversation';
import type { ReactNode } from 'react';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ThinkingItemLayout } from './thinking_item_layout';

interface ToolProgressDisplayProps {
  progress: ToolCallProgress;
  icon?: ReactNode;
  textColor?: string;
  toolId?: string;
}

const STEP_TOOL_PREFIX = 'platform.workflows.step.';

export const ToolProgressDisplay: React.FC<ToolProgressDisplayProps> = ({
  progress,
  icon,
  textColor,
  toolId,
}) => {
  const { euiTheme } = useEuiTheme();
  const isStepTool = toolId?.startsWith(STEP_TOOL_PREFIX);
  const msg = progress.message;

  if (isStepTool) {
    const isError = msg.startsWith('stderr:');

    return (
      <ThinkingItemLayout textColor={textColor} icon={icon}>
        <code
          role="status"
          aria-live="polite"
          css={css`
            font-size: 13px;
            color: ${isError ? euiTheme.colors.dangerText : undefined};
          `}
        >
          {msg}
        </code>
      </ThinkingItemLayout>
    );
  }

  return (
    <ThinkingItemLayout textColor={textColor} icon={icon}>
      <div role="status" aria-live="polite">
        {msg}
      </div>
    </ThinkingItemLayout>
  );
};
