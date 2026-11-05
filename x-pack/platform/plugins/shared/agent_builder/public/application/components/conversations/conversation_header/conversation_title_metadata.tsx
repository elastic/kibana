/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useConversation } from '../../../hooks/use_conversation';
import { ConversationMetadataFlyout } from './conversation_metadata_flyout';

const labels = {
  newConversation: i18n.translate('xpack.agentBuilder.conversationTitleMetadata.newConversation', {
    defaultMessage: 'New conversation',
  }),
};

const titleButtonStyles = css`
  max-width: 100%;
  block-size: auto;
  padding: 0;
`;

interface ConversationTitleMetadataProps {
  ariaLabelledBy?: string;
}

export const ConversationTitleMetadata = ({ ariaLabelledBy }: ConversationTitleMetadataProps) => {
  const { conversation, isLoading: isLoadingTitle } = useConversation();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const displayedTitle = isLoadingTitle ? '' : conversation?.title || labels.newConversation;

  return (
    <>
      <EuiButtonEmpty
        color="text"
        flush="left"
        onClick={() => setIsFlyoutOpen((isOpen) => !isOpen)}
        aria-expanded={isFlyoutOpen}
        css={titleButtonStyles}
        data-test-subj="agentBuilderConversationTitleButton"
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.pageContent,
          action: AGENT_BUILDER_UI_EBT.action.conversation.OPEN_TITLE_MENU,
          detail: 'conversation',
        })}
      >
        <EuiTitle size="xs">
          <h4 id={ariaLabelledBy}>{displayedTitle}</h4>
        </EuiTitle>
      </EuiButtonEmpty>
      {isFlyoutOpen && conversation ? (
        <ConversationMetadataFlyout
          key={conversation.id}
          conversation={conversation}
          onClose={() => setIsFlyoutOpen(false)}
        />
      ) : null}
    </>
  );
};
