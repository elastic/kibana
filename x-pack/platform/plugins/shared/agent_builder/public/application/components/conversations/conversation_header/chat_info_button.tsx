/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { ConversationDetailsFlyout } from '../../../../flyout/conversation_details_flyout';

const labels = {
  chatInfo: i18n.translate('xpack.agentBuilder.chatInfoButton.label', {
    defaultMessage: 'Chat info',
  }),
};

export const ChatInfoButton = () => {
  const conversationId = useConversationId();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  if (!conversationId) {
    return null;
  }

  return (
    <>
      <EuiButtonEmpty
        size="s"
        color="text"
        iconType={isFlyoutOpen ? 'transitionLeftIn' : 'transitionLeftOut'}
        onClick={() => setIsFlyoutOpen((open) => !open)}
        aria-label={labels.chatInfo}
        aria-expanded={isFlyoutOpen}
        data-test-subj="agentBuilderChatInfoButton"
      >
        {labels.chatInfo}
      </EuiButtonEmpty>
      {isFlyoutOpen && <ConversationDetailsFlyout onClose={() => setIsFlyoutOpen(false)} />}
    </>
  );
};
