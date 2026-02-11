/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { ChatMessageText } from './chat_message_text';

const TOKEN_DELAY = 17;
interface StreamingTextProps {
  content: string;
  steps: ConversationRoundStep[];
  tokenDelay?: number; // ms between tokens. Defaults to 17ms to ensure 60fps.
}

export const StreamingText = ({ content, steps, tokenDelay = TOKEN_DELAY }: StreamingTextProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const tokenQueueRef = useRef<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousContentLengthRef = useRef(0);

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
        if (tokenQueueRef.current.length === 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return;
        }

        const nextToken = tokenQueueRef.current.shift();
        if (nextToken) {
          setDisplayedText((prev) => prev + nextToken);
        }
      }, tokenDelay);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [content, tokenDelay]);

  return <ChatMessageText content={displayedText} steps={steps} />;
};
