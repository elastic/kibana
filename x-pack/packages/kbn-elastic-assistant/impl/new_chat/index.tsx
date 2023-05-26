/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { PromptContext } from '../assistant/prompt_context/types';
import { useAssistantOverlay } from '../assistant/use_assistant_overlay';

import * as i18n from './translations';

const NewChatComponent: React.FC<{
  promptContext?: Omit<PromptContext, 'id'>;
  promptContextId?: string;
  conversationId?: string;
}> = ({ conversationId, promptContext, promptContextId }) => {
  const { showAssistantOverlay } = useAssistantOverlay({
    conversationId,
    promptContextId,
    promptContext,
  });

  const showOverlay = useCallback(() => {
    showAssistantOverlay(true);
  }, [showAssistantOverlay]);

  return useMemo(
    () => (
      <EuiButtonEmpty onClick={showOverlay} iconType="discuss">
        {i18n.NEW_CHAT}
      </EuiButtonEmpty>
    ),
    [showOverlay]
  );
};

NewChatComponent.displayName = 'NewChatComponent';

export const NewChat = React.memo(NewChatComponent);
