/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useConversation } from '../../hooks/use_conversation';

interface AttachmentMapRebuilderProps {
  children: React.ReactNode;
  attachmentContentMapRef: React.MutableRefObject<Map<string, Record<string, unknown>>>;
}

/**
 * Component that rebuilds the attachment content map from conversation history.
 * This ensures that attachments are not resent unnecessarily after page refresh
 * by tracking what attachment content has already been sent in previous messages.
 */
export const AttachmentMapRebuilder: React.FC<AttachmentMapRebuilderProps> = ({
  children,
  attachmentContentMapRef,
}) => {
  const { conversation } = useConversation();

  useEffect(() => {
    if (conversation?.rounds && conversation.rounds.length > 0) {
      const rebuiltMap = new Map<string, Record<string, unknown>>();

      conversation.rounds.forEach((round) => {
        if (round.input.attachments && Array.isArray(round.input.attachments)) {
          round.input.attachments.forEach((attachment) => {
            if (attachment.id && attachment.data) {
              rebuiltMap.set(attachment.id, attachment.data);
            }
          });
        }
      });

      attachmentContentMapRef.current = rebuiltMap;

      // Log for debugging (can be removed in production)
      // eslint-disable-next-line no-console
      console.debug(
        `Rebuilt attachment content map with ${rebuiltMap.size} attachments from conversation history`
      );
    }
  }, [conversation?.rounds, attachmentContentMapRef]);

  return <>{children}</>;
};
