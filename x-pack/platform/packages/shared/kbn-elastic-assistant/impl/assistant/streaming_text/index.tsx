/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

export interface StreamingTextProps {
  text: string;
  children?: (text: string, isStreamingComplete: boolean) => React.ReactNode;
  chunkSize?: number;
  delay?: number;
  onStreamingComplete?: () => void;
}

export const StreamingText: React.FC<StreamingTextProps> = React.memo<StreamingTextProps>(
  ({ text, children, chunkSize = 5, delay = 100, onStreamingComplete }) => {
    const [displayText, setDisplayText] = useState<string>(delay > 0 ? '' : text);
    const [isStreamingComplete, setIsStreamingComplete] = useState<boolean>(
      delay == null || delay === 0
    );

    useEffect(() => {
      if (delay === 0) {
        onStreamingComplete?.();
      }
      // Only run on initial render so onStreamingComplete is only called once if delay is 0
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (isStreamingComplete || delay === 0) {
        setDisplayText(text);
        return;
      }

      let currentPos = 0;
      setIsStreamingComplete(false);
      const interval = setInterval(() => {
        if (currentPos >= text.length) {
          onStreamingComplete?.();
          setIsStreamingComplete(true);
          clearInterval(interval);
          return;
        }

        const chunk = text.substring(currentPos, currentPos + chunkSize);
        setDisplayText((prevText) => prevText + chunk);
        currentPos += chunkSize;
      }, delay);

      return () => {
        clearInterval(interval);
      };
    }, [text, chunkSize, delay, onStreamingComplete, isStreamingComplete]);

    if (children) {
      return <div>{children(displayText, isStreamingComplete)}</div>;
    } else {
      return <div>{displayText}</div>;
    }
  }
);
StreamingText.displayName = 'StreamingText';
