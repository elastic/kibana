/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { deserializeCommandBadge } from '../conversation_input/message_editor/command_badge';
import { getCommandDefinition } from '../conversation_input/message_editor/command_menu';

interface CommandBadgeTextProps {
  text: string;
}

/**
 * Renders text with inline command badge styling.
 * Parses serialized badge markdown-links and renders them as styled spans.
 */
export const CommandBadgeText: React.FC<CommandBadgeTextProps> = ({ text }) => {
  const { euiTheme } = useEuiTheme();
  const segments = useMemo(() => deserializeCommandBadge(text), [text]);

  const badgeStyle = css`
    color: ${euiTheme.colors.textPrimary};
    background-color: ${euiTheme.colors.backgroundLightPrimary};
    border-radius: ${euiTheme.border.radius.small};
    padding: 0 ${euiTheme.size.xs};
  `;

  const hasNoBadges = segments.every((s) => s.type === 'text');
  if (hasNoBadges) {
    return <>{text}</>;
  }

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <React.Fragment key={index}>{segment.value}</React.Fragment>;
        }
        return (
          <span key={index} css={badgeStyle}>
            {getCommandDefinition(segment.data.commandId)?.sequence ?? ''}
            {segment.data.label}
          </span>
        );
      })}
    </>
  );
};
