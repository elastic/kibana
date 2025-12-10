/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  useEuiTheme,
  euiTextBreakWord,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { type Attachment } from '@kbn/onechat-common/attachments';
import { ROUNDED_BORDER_RADIUS_LARGE } from '../conversation.styles';
import { AttachmentPillsRow } from '../conversation_input/attachment_pills_row';

const labels = {
  userMessage: i18n.translate('xpack.onechat.round.userInput', {
    defaultMessage: 'User input',
  }),
};

interface RoundInputProps {
  input: string;
  attachments?: Attachment[];
}

export const RoundInput = ({ input, attachments }: RoundInputProps) => {
  const { euiTheme } = useEuiTheme();

  const backgroundColorStyle = {
    background: `linear-gradient(
          90deg,
          ${euiTheme.colors.backgroundBasePrimary} 0%,
          ${euiTheme.colors.backgroundBasePrimary} 70%,
          ${euiTheme.colors.backgroundBaseSubdued} 100%
        )`,
  };

  const inputContainerStyles = css`
    align-self: end;
    max-inline-size: 90%;
    background: ${backgroundColorStyle.background};
    ${euiTextBreakWord()}
    white-space: pre-wrap;
    border-radius: ${`${ROUNDED_BORDER_RADIUS_LARGE} ${ROUNDED_BORDER_RADIUS_LARGE} 0 ${ROUNDED_BORDER_RADIUS_LARGE}`};
  `;

  const visibleAttachments = useMemo(() => {
    if (!attachments) return [];
    return attachments.filter((attachment) => !attachment.hidden);
  }, [attachments]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexEnd">
      <EuiPanel
        css={inputContainerStyles}
        paddingSize="m"
        hasShadow={false}
        hasBorder={false}
        aria-label={labels.userMessage}
      >
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="m">{input}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {visibleAttachments.length > 0 && (
        <EuiFlexItem grow={false}>
          <AttachmentPillsRow attachments={visibleAttachments} justifyContent="flexEnd" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
