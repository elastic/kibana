/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiSuperSelect,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common';
import { useConversation } from '../../../hooks/use_conversation';

const POPOVER_WIDTH = 470;

const labels = {
  sharing: i18n.translate('xpack.agentBuilder.conversationSharingButton.sharing', {
    defaultMessage: 'Sharing',
  }),
  close: i18n.translate('xpack.agentBuilder.conversationSharingButton.close', {
    defaultMessage: 'Close',
  }),
  generalAccess: i18n.translate('xpack.agentBuilder.conversationSharingButton.generalAccess', {
    defaultMessage: 'General access',
  }),
  public: i18n.translate('xpack.agentBuilder.conversationSharingButton.public', {
    defaultMessage: 'Public',
  }),
  publicDescription: i18n.translate(
    'xpack.agentBuilder.conversationSharingButton.publicDescription',
    { defaultMessage: 'Anyone in this space can access and continue this conversation' }
  ),
  private: i18n.translate('xpack.agentBuilder.conversationSharingButton.private', {
    defaultMessage: 'Private',
  }),
  privateDescription: i18n.translate(
    'xpack.agentBuilder.conversationSharingButton.privateDescription',
    { defaultMessage: 'Only you can access and continue this conversation' }
  ),
};

const OPTION_META: Record<ConversationAccessControlMode, { title: string; description: string }> = {
  [ConversationAccessControlMode.Public]: {
    title: labels.public,
    description: labels.publicDescription,
  },
  [ConversationAccessControlMode.Private]: {
    title: labels.private,
    description: labels.privateDescription,
  },
};

// The closed control renders `inputDisplay` in a single fixed-height row, so a second
// line (the subtitle) would just get clipped there — title-only when closed, full
// title+subtitle only in the open dropdown where there's room for both.
const renderCompactOption = (mode: ConversationAccessControlMode) => (
  <strong>{OPTION_META[mode].title}</strong>
);

const renderFullOption = (mode: ConversationAccessControlMode) => {
  const { title, description } = OPTION_META[mode];
  return (
    <>
      <strong>{title}</strong>
      <EuiText size="xs" color="subdued">
        <p>{description}</p>
      </EuiText>
    </>
  );
};

const options: Array<EuiSuperSelectOption<ConversationAccessControlMode>> = [
  {
    value: ConversationAccessControlMode.Public,
    inputDisplay: renderCompactOption(ConversationAccessControlMode.Public),
    dropdownDisplay: renderFullOption(ConversationAccessControlMode.Public),
  },
  {
    value: ConversationAccessControlMode.Private,
    inputDisplay: renderCompactOption(ConversationAccessControlMode.Private),
    dropdownDisplay: renderFullOption(ConversationAccessControlMode.Private),
  },
];

export const ConversationSharingButton: React.FC = () => {
  const { conversation } = useConversation();
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (!conversation) {
    return null;
  }

  const accessMode =
    conversation.access_control?.access_mode ?? ConversationAccessControlMode.Private;

  // No backend endpoint exists yet to persist conversation visibility — no-op for now.
  const handleChange = (_mode: ConversationAccessControlMode) => {};

  const button = (
    <EuiButton
      size="s"
      color="text"
      fill={false}
      iconType="globe"
      onClick={() => setIsPopoverOpen((open) => !open)}
      data-test-subj="agentBuilderConversationSharingButton"
    >
      {OPTION_META[accessMode].title}
    </EuiButton>
  );

  const panelStyles = css`
    width: ${POPOVER_WIDTH}px;
  `;

  const headerStyles = css`
    padding: ${euiTheme.size.m};
  `;

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <div css={panelStyles}>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
          css={headerStyles}
        >
          <EuiFlexItem grow={false}>
            <EuiText
              size="s"
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
            >
              <p>{labels.sharing}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              onClick={() => setIsPopoverOpen(false)}
              aria-label={labels.close}
              data-test-subj="agentBuilderConversationSharingCloseButton"
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="none" />

        <div css={headerStyles}>
          <EuiText
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            <p>{labels.generalAccess}</p>
          </EuiText>
          <EuiSuperSelect
            options={options}
            valueOfSelected={accessMode}
            onChange={handleChange}
            fullWidth
            aria-label={labels.generalAccess}
            data-test-subj="agentBuilderConversationSharingSelect"
          />
        </div>
      </div>
    </EuiPopover>
  );
};
