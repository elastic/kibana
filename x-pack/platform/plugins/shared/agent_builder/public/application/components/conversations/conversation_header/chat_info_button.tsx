/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversation } from '../../../hooks/use_conversation';
import { useQueryState } from '../../../hooks/use_query_state';
import { ConversationDetailsFlyout } from '../../../../flyout/conversation_details_flyout';
import { searchParamNames } from '../../../search_param_names';

const labels = {
  chatInfo: i18n.translate('xpack.agentBuilder.chatInfoButton.label', {
    defaultMessage: 'Chat info',
  }),
};

export const ChatInfoButton = () => {
  const conversationId = useConversationId();
  const { conversation } = useConversation();
  const [openConversationDetails, setOpenConversationDetails] = useQueryState<string>(
    searchParamNames.openConversationDetails
  );

  const isFlyoutOpen = openConversationDetails === 'true';

  const openFlyout = useCallback(
    () => setOpenConversationDetails('true'),
    [setOpenConversationDetails]
  );
  const closeFlyout = useCallback(
    () => setOpenConversationDetails(null),
    [setOpenConversationDetails]
  );

  if (!conversationId || !conversation?.template_id) {
    return null;
  }

  return (
    <>
      <EuiButtonEmpty
        size="s"
        color="text"
        iconType={isFlyoutOpen ? 'transitionLeftIn' : 'transitionLeftOut'}
        onClick={isFlyoutOpen ? closeFlyout : openFlyout}
        aria-label={labels.chatInfo}
        aria-expanded={isFlyoutOpen}
        data-test-subj="agentBuilderChatInfoButton"
      >
        {labels.chatInfo}
      </EuiButtonEmpty>
      {isFlyoutOpen && <ConversationDetailsFlyout onClose={closeFlyout} />}
    </>
  );
};
