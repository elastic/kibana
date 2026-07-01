/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { ConversationDisplayStatus } from '@kbn/agent-builder-common';

export const createConversationListItemStyles = (euiTheme: EuiThemeComputed) => css`
  text-decoration: none;
  padding: 6px ${euiTheme.size.s};
  border-radius: ${euiTheme.border.radius.small};
  color: ${euiTheme.colors.textParagraph};
  font-size: ${euiTheme.font.scale.m}${euiTheme.font.defaultUnits};
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  &:hover {
    background-color: ${euiTheme.colors.backgroundLightPrimary};
    color: ${euiTheme.colors.textPrimary};
    text-decoration: none;
  }
`;

export const createActiveConversationListItemStyles = (euiTheme: EuiThemeComputed) => css`
  ${createConversationListItemStyles(euiTheme)}
  background-color: ${euiTheme.colors.backgroundLightPrimary};
  color: ${euiTheme.colors.textPrimary};
`;

export const createStatusLinkStyles = (
  status: ConversationDisplayStatus | undefined,
  euiTheme: EuiThemeComputed
) => {
  if (!status) return undefined;

  switch (status) {
    case ConversationDisplayStatus.unread:
    case ConversationDisplayStatus.awaitingPrompt:
      return css`
        color: ${euiTheme.colors.textParagraph};
        font-weight: ${euiTheme.font.weight.medium};
      `;

    case ConversationDisplayStatus.read:
    case ConversationDisplayStatus.inProgress:
      return css`
        color: ${euiTheme.colors.textDisabled};
        font-weight: ${euiTheme.font.weight.regular};
      `;

    case ConversationDisplayStatus.error:
      return css`
        color: ${euiTheme.colors.textParagraph};
        font-weight: ${euiTheme.font.weight.regular};
      `;

    default:
      return undefined;
  }
};
