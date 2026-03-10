/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';

export interface CursorState {
  actionsCursor?: string;
  scheduledCursor?: string;
  scheduledOffset?: number;
}

export const useCursorPagination = () => {
  const [cursorStack, setCursorStack] = useState<CursorState[]>([]);

  const currentCursors = cursorStack.length > 0 ? cursorStack[cursorStack.length - 1] : undefined;
  const pageIndex = cursorStack.length;

  const handleNextPage = useCallback(
    (nextCursors: {
      nextActionsCursor?: string;
      nextScheduledCursor?: string;
      nextScheduledOffset?: number;
    }) => {
      if (nextCursors.nextActionsCursor || nextCursors.nextScheduledCursor) {
        setCursorStack((prev) => [
          ...prev,
          {
            actionsCursor: nextCursors.nextActionsCursor,
            scheduledCursor: nextCursors.nextScheduledCursor,
            scheduledOffset: nextCursors.nextScheduledOffset,
          },
        ]);
      }
    },
    []
  );

  const handlePrevPage = useCallback(() => {
    setCursorStack((prev) => prev.slice(0, -1));
  }, []);

  const resetCursors = useCallback(() => {
    setCursorStack([]);
  }, []);

  return {
    pageIndex,
    currentCursors,
    handleNextPage,
    handlePrevPage,
    resetCursors,
  };
};
