/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { euiTextTruncate, useEuiTheme, EuiMarkdownFormat } from '@elastic/eui';
import { COMMAND_BADGE_MAX_WIDTH_CH } from '../../conversation_input/message_editor/command_badge/constants';
import { createUserMessageMarkdownPlugins } from './user_message_markdown_plugins';

interface UserMessageTextProps {
  text: string;
  onHoverImage?: (name: string | null) => void;
}

const useUserMessageTextStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    // Mirrors ChatMessageText's container tweaks so list spacing matches the assistant side —
    // EUI's markdown defaults render lists looser than this bubble's compact style wants.
    container: css`
      overflow-wrap: anywhere;

      ol > li:not(:first-child) {
        margin-top: ${euiTheme.size.s};
      }

      ol > li > p {
        margin-bottom: ${euiTheme.size.s};
      }

      .euiMarkdownFormat > ul > li,
      .euiMarkdownFormat > ol > li {
        line-height: ${euiTheme.size.l};
      }
    `,
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

export const UserMessageText: React.FC<UserMessageTextProps> = ({ text, onHoverImage }) => {
  const styles = useUserMessageTextStyles();

  const { parsingPluginList, processingPluginList } = useMemo(
    () => createUserMessageMarkdownPlugins({ styles, onHoverImage }),
    [styles, onHoverImage]
  );

  return (
    <div css={styles.container}>
      <EuiMarkdownFormat
        textSize="s"
        parsingPluginList={parsingPluginList}
        processingPluginList={processingPluginList}
      >
        {text}
      </EuiMarkdownFormat>
    </div>
  );
};
