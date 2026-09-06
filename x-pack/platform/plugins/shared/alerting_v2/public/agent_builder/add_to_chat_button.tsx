/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { i18n } from '@kbn/i18n';
import type { AttachmentConverter } from './auto_attach';
import { useManualAddToChat } from './use_manual_add_to_chat';

const ADD_TO_CHAT_BUTTON_LABEL = i18n.translate(
  'xpack.alertingV2.agentBuilder.addToChatButtonLabel',
  {
    defaultMessage: 'Add to chat',
  }
);

export interface AddToChatButtonProps<FocusedItem> {
  item: FocusedItem | undefined;
  converter: AttachmentConverter<FocusedItem>;
  'data-test-subj'?: string;
}

export const AddToChatButton = <FocusedItem,>({
  item,
  converter,
  'data-test-subj': dataTestSubj = 'alertingV2AddToChatButton',
}: AddToChatButtonProps<FocusedItem>): React.ReactElement | null => {
  const { addToChat, isAddToChatAvailable } = useManualAddToChat(item, converter);

  if (!isAddToChatAvailable) {
    return null;
  }

  return (
    <AiButton
      variant="empty"
      size="s"
      iconType="productAgent"
      iconSide="left"
      onClick={addToChat}
      data-test-subj={dataTestSubj}
      aria-label={ADD_TO_CHAT_BUTTON_LABEL}
    >
      {ADD_TO_CHAT_BUTTON_LABEL}
    </AiButton>
  );
};
