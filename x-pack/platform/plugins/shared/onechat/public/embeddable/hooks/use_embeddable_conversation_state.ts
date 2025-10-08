/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback, useRef } from 'react';

interface UseEmbeddableConversationStateProps {
  initialConversationId?: string;
  onConversationCreated?: (conversationId: string) => void;
}

export const useEmbeddableConversationState = ({
  initialConversationId,
  onConversationCreated,
}: UseEmbeddableConversationStateProps) => {
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const callbackFiredRef = useRef(false);

  // Reset when initialConversationId changes
  useEffect(() => {
    setConversationId(initialConversationId);
    callbackFiredRef.current = false;
  }, [initialConversationId]);

  const handleConversationCreated = useCallback(
    (newConversationId: string) => {
      setConversationId(newConversationId);

      // Only fire callback once per conversation creation
      if (onConversationCreated && !callbackFiredRef.current) {
        callbackFiredRef.current = true;
        onConversationCreated(newConversationId);
      }
    },
    [onConversationCreated]
  );

  return {
    conversationId,
    setConversationId: handleConversationCreated,
  };
};
