/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { ConversationRoundStep } from '@kbn/onechat-common';
import { ChatMessageText } from './chat_message_text';

interface StreamingTextProps {
  content: string;
  steps: ConversationRoundStep[];
  charDelay?: number;
}

export const StreamingText = ({ content, steps, charDelay = 10 }: StreamingTextProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const characterQueueRef = useRef<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousContentRef = useRef('');

  useEffect(() => {
    const previousContent = previousContentRef.current;
    const newContent = content.slice(previousContent.length);

    if (newContent.length > 0) {
      characterQueueRef.current.push(...newContent);
      previousContentRef.current = content;
    }

    if (!intervalRef.current && characterQueueRef.current.length > 0) {
      intervalRef.current = setInterval(() => {
        if (characterQueueRef.current.length === 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return;
        }

        const nextChar = characterQueueRef.current.shift();
        if (nextChar) {
          setDisplayedText((prev) => prev + nextChar);
        }
      }, charDelay);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [content, charDelay]);

  return <ChatMessageText content={displayedText} steps={steps} />;
};
