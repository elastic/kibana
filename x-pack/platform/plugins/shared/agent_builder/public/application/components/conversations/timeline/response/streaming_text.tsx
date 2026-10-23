/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import type {
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import { ChatMessageText } from './chat_message_text';

const TOKEN_DELAY = 17;
/** Each tick shows 1/10 of the waiting tokens (at least 1), so a long wait ends fast. */
const CATCH_UP_TICKS = 10;
interface StreamingTextProps {
  content: string;
  steps: ConversationRoundStep[];
  tokenDelay?: number; // ms between tokens. Defaults to 17ms to ensure 60fps.
  conversationAttachments?: VersionedAttachment[];
  attachmentRefs?: AttachmentVersionRef[];
  conversationId?: string;
}

export const StreamingText = ({
  content,
  steps,
  tokenDelay = TOKEN_DELAY,
  conversationAttachments,
  attachmentRefs,
  conversationId,
}: StreamingTextProps) => {
  // Initial state derives from the content already in the cache so navigating away and back
  // mid-stream doesn't replay the full text. Only chunks arriving AFTER mount get animated.
  const [displayedText, setDisplayedText] = useState(content);
  const tokenQueueRef = useRef<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousContentLengthRef = useRef(content.length);

  useEffect(() => {
    const previousContentLength = previousContentLengthRef.current;
    const newContent = content.slice(previousContentLength);

    if (newContent.length > 0) {
      // Split the new content into tokens, preserving spaces
      const tokens = newContent.split(/(\s+)/).filter((token) => token.length > 0);
      tokenQueueRef.current.push(...tokens);
      previousContentLengthRef.current = content.length;
    }

    if (!intervalRef.current && tokenQueueRef.current.length > 0) {
      intervalRef.current = setInterval(() => {
        const queue = tokenQueueRef.current;
        if (queue.length === 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return;
        }

        const count = Math.ceil(queue.length / CATCH_UP_TICKS);
        const nextTokens = queue.splice(0, count).join('');
        setDisplayedText((prev) => prev + nextTokens);
      }, tokenDelay);
    }
  }, [content, tokenDelay]);

  useEffect(
    () => () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    },
    []
  );

  return (
    <ChatMessageText
      content={displayedText}
      steps={steps}
      conversationAttachments={conversationAttachments}
      attachmentRefs={attachmentRefs}
      conversationId={conversationId}
      isStreaming
    />
  );
};
