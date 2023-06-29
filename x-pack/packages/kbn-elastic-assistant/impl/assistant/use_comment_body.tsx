/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiMarkdownFormat, EuiText } from '@elastic/eui';
import React from 'react';
import { Message } from '../..';
import { StreamingText } from './streaming_text';

export const useCommentBody = (
  message: Message,
  index: number,
  length: number,
  timestamp: string
) => {
  // If timestamp is not set, set it to current time (will update conversation at end of setup)
  const adjustTimestamp = timestamp.length === 0 ? new Date().toLocaleString() : timestamp;
  const isLastMessage = index === length - 1;
  const enableStreaming =
    (message.presentation?.stream ?? false) && currentMessageIndex !== length - 1;
  return (
    <StreamingText
      text={message.content}
      delay={enableStreaming ? 50 : 0}
      onStreamingComplete={
        isLastMessage ? onHandleLastMessageStreamingComplete : onHandleMessageStreamingComplete
      }
    >
      {(streamedText, isStreamingComplete) => (
        <EuiText>
          <EuiMarkdownFormat className={`message-${index}`}>{streamedText}</EuiMarkdownFormat>
          {isLastMessage && isStreamingComplete && <span ref={lastCommentRef} />}
        </EuiText>
      )}
    </StreamingText>
  );
};
