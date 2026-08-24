/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { euiTextTruncate, useEuiTheme, EuiToolTip, EuiIcon } from '@elastic/eui';
import { deserializeInputSegments } from '../conversation_input/message_editor/command_badge';
import { COMMAND_BADGE_MAX_WIDTH_CH } from '../conversation_input/message_editor/command_badge/constants';
import { getCommandDefinition } from '../conversation_input/message_editor/command_menu';

interface RoundInputTextProps {
  text: string;
}

/**
 * Renders text with inline command badge and image badge styling.
 * Parses serialized badge and image markdown-links and renders them as styled spans.
 */
export const RoundInputText: React.FC<RoundInputTextProps> = ({ text }) => {
  const { euiTheme } = useEuiTheme();
  const segments = useMemo(() => deserializeInputSegments(text), [text]);

  const { badgeStyle, commandBadgeWrapperCss, commandBadgeInnerCss } = useMemo(
    () => ({
      badgeStyle: css`
        color: ${euiTheme.colors.textPrimary};
        background-color: ${euiTheme.colors.backgroundLightPrimary};
        border-radius: ${euiTheme.border.radius.small};
        padding: 0 ${euiTheme.size.xs};
      `,
      commandBadgeWrapperCss: css`
        display: inline-flex;
        align-items: baseline;
        max-width: ${COMMAND_BADGE_MAX_WIDTH_CH}ch;
        min-width: 0;
        vertical-align: baseline;
        line-height: inherit;
      `,
      commandBadgeInnerCss: css`
        min-width: 0;
        ${euiTextTruncate('100%')}
      `,
    }),
    [
      euiTheme.border.radius.small,
      euiTheme.colors.backgroundLightPrimary,
      euiTheme.colors.textPrimary,
      euiTheme.size.xs,
    ]
  );

  const imageBadgeWrapperCss = useMemo(
    () => css`
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      gap: ${euiTheme.size.xs};
      min-width: 0;
      max-width: 24ch;
      line-height: inherit;
      background: ${euiTheme.colors.backgroundFilledPrimary};
      color: ${euiTheme.colors.textInverse};
      border-radius: ${euiTheme.border.radius.small};
      padding: 0 ${euiTheme.size.xs};
      &:hover .image-badge-label {
        text-decoration: underline;
      }
    `,
    [
      euiTheme.border.radius.small,
      euiTheme.colors.backgroundFilledPrimary,
      euiTheme.colors.textInverse,
      euiTheme.size.xs,
    ]
  );

  const imageBadgeInnerCss = useMemo(
    () => css`
      min-width: 0;
      ${euiTextTruncate('100%')}
    `,
    []
  );

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

        if (segment.type === 'image') {
          return (
            <EuiToolTip key={index} content={segment.name} disableScreenReaderOutput>
              <span css={imageBadgeWrapperCss} tabIndex={0}>
                <EuiIcon type="document" size="s" aria-hidden={true} />
                <span className="image-badge-label" css={imageBadgeInnerCss}>
                  {segment.name}
                </span>
              </span>
            </EuiToolTip>
          );
        }

        const sequence = getCommandDefinition(segment.data.commandId)?.sequence ?? '';
        const fullBadgeText = `${sequence}${segment.data.label}`;
        return (
          <EuiToolTip key={index} content={fullBadgeText} disableScreenReaderOutput>
            <span css={[badgeStyle, commandBadgeWrapperCss]} tabIndex={0}>
              <span css={commandBadgeInnerCss}>{fullBadgeText}</span>
            </span>
          </EuiToolTip>
        );
      })}
    </>
  );
};
