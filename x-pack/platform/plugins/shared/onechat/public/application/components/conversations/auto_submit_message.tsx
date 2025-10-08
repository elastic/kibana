/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useCustomMessage } from '../../context/custom_message_context';
import { useSendMessage } from '../../context/send_message/send_message_context';
import { useAdditionalContext } from '../../context/additional_context/additional_context';

/**
 * Component that automatically submits a custom message when the conversation is ready.
 * This is used for auto-submitting messages when opening the flyout with a predefined message.
 */
export const AutoSubmitMessage: React.FC = () => {
  const { consumeCustomMessage } = useCustomMessage();
  const { sendMessage, isResponseLoading } = useSendMessage();
  const { consumeAdditionalContext } = useAdditionalContext();
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    // Only auto-submit once
    if (hasSubmittedRef.current) {
      return;
    }

    // Don't auto-submit if already loading a response
    if (isResponseLoading) {
      return;
    }

    const customMessage = consumeCustomMessage();
    if (!customMessage) {
      return;
    }

    // Mark as submitted before sending to prevent duplicate submissions
    hasSubmittedRef.current = true;

    // Get additional context if available
    const additionalContext = consumeAdditionalContext();

    // Submit the custom message
    sendMessage({ message: customMessage, additionalContext });
  }, [consumeCustomMessage, sendMessage, consumeAdditionalContext, isResponseLoading]);

  // This component doesn't render anything
  return null;
};

