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
import { useClientTools } from '../../context/client_tools_context';

/**
 * Component that automatically submits a custom message when the conversation is ready.
 * This is used for auto-submitting messages when opening the flyout with a predefined message.
 */
export const AutoSubmitMessage: React.FC = () => {
  const { consumeCustomMessage } = useCustomMessage();
  const { sendMessage, isResponseLoading } = useSendMessage();
  const { consumeAdditionalContext } = useAdditionalContext();
  const clientTools = useClientTools();
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
    let additionalContext = consumeAdditionalContext();

    // If client tools are available, append instructions about them to additional context
    if (clientTools && Object.keys(clientTools).length > 0) {
      const clientToolsInstructions = `\n\nCLIENT-SIDE TOOLS:\nYou have access to client-side tools that can be invoked by rendering special tags in your response. Available client-side tools:\n\n${Object.entries(
        clientTools
      )
        .map(
          ([id, tool]) =>
            `- ${id}: ${tool.description}\n  Input schema: ${JSON.stringify(tool.input, null, 2)}\n  To call this tool, render: <clientToolCall id="${id}" params='${JSON.stringify(
              {}
            )}' />`
        )
        .join('\n\n')}\n\nIMPORTANT: These tools execute in the user's browser. Only call them when appropriate. The params attribute should be a JSON string matching the input schema.`;
      
      additionalContext = additionalContext
        ? `${additionalContext}${clientToolsInstructions}`
        : clientToolsInstructions;
    }

    // Submit the custom message
    sendMessage({ message: customMessage, additionalContext });
  }, [consumeCustomMessage, sendMessage, consumeAdditionalContext, isResponseLoading, clientTools]);

  // This component doesn't render anything
  return null;
};

