/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';

interface CursorPaginationState {
  cursorStack: string[];
  currentCursor: string | undefined;
  pageIndex: number;
}

interface UseCursorPaginationReturn {
  currentCursor: string | undefined;
  pageIndex: number;
  goToNextPage: (nextCursor: string) => void;
  goToPage: (targetIndex: number) => void;
  resetPagination: () => void;
}

const INITIAL_STATE: CursorPaginationState = {
  cursorStack: [],
  currentCursor: undefined,
  pageIndex: 0,
};

export const useCursorPagination = (): UseCursorPaginationReturn => {
  const [state, setState] = useState<CursorPaginationState>(INITIAL_STATE);

  const goToNextPage = useCallback((nextCursor: string) => {
    setState((prev) => ({
      cursorStack: [...prev.cursorStack, nextCursor],
      currentCursor: nextCursor,
      pageIndex: prev.pageIndex + 1,
    }));
  }, []);

  const goToPage = useCallback((targetIndex: number) => {
    setState((prev) => {
      if (targetIndex <= 0) return INITIAL_STATE;
      if (targetIndex >= prev.pageIndex) return prev;
      const newStack = prev.cursorStack.slice(0, targetIndex);
      const newCursor = newStack[newStack.length - 1];

      return {
        cursorStack: newStack,
        currentCursor: newCursor,
        pageIndex: targetIndex,
      };
    });
  }, []);

  const resetPagination = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    currentCursor: state.currentCursor,
    pageIndex: state.pageIndex,
    goToNextPage,
    goToPage,
    resetPagination,
  };
};
