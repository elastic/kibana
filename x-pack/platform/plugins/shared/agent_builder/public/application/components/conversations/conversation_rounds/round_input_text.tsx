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

const useRoundInputTextStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    badge: css`
      color: ${euiTheme.colors.textPrimary};
      background-color: ${euiTheme.colors.backgroundLightPrimary};
      border-radius: ${euiTheme.border.radius.small};
      padding: 0 ${euiTheme.size.xs};
    `,
    commandBadgeWrapper: css`
      display: inline-flex;
      align-items: baseline;
      max-width: ${COMMAND_BADGE_MAX_WIDTH_CH}ch;
      min-width: 0;
      vertical-align: baseline;
      line-height: inherit;
    `,
    commandBadgeInner: css`
      min-width: 0;
      ${euiTextTruncate('100%')}
    `,
    imageBadgeWrapper: css`
      display: inline-flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      min-width: 0;
      max-width: 24ch;
      font-size: ${euiTheme.size.base};
      height: 20px;
      background: ${euiTheme.colors.backgroundFilledPrimary};
      color: ${euiTheme.colors.textInverse};
      border-radius: ${euiTheme.border.radius.small};
      padding: 0 ${euiTheme.size.xs};
      &:hover {
        background: ${euiTheme.colors.textPrimary};
      }
    `,
    imageBadgeInner: css`
      min-width: 0;
      ${euiTextTruncate('100%')}
    `,
  };
};

export const RoundInputText: React.FC<RoundInputTextProps> = ({ text }) => {
  const segments = useMemo(() => deserializeInputSegments(text), [text]);
  const styles = useRoundInputTextStyles();

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
              <span css={styles.imageBadgeWrapper} tabIndex={0}>
                <EuiIcon type="image" size="s" aria-hidden={true} />
                <span className="image-badge-label" css={styles.imageBadgeInner}>
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
            <span css={[styles.badge, styles.commandBadgeWrapper]} tabIndex={0}>
              <span css={styles.commandBadgeInner}>{fullBadgeText}</span>
            </span>
          </EuiToolTip>
        );
      })}
    </>
  );
};
