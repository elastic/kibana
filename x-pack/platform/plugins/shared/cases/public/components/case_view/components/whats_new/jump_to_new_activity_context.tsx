/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

type JumpHandler = () => void;

interface JumpToNewActivityContextValue {
  register: (handler: JumpHandler | undefined) => void;
  jump: () => void;
}

const JumpToNewActivityContext = createContext<JumpToNewActivityContextValue | undefined>(
  undefined
);

/**
 * The panel above the tabs asks the activity feed to show its first new item. Only the feed knows
 * how to load collapsed activities, so it registers the handler here. The handler lives in a ref,
 * so registering never re-renders the panel.
 */
export const JumpToNewActivityProvider: FC<PropsWithChildren> = ({ children }) => {
  const handlerRef = useRef<JumpHandler | undefined>(undefined);

  const register = useCallback((handler: JumpHandler | undefined) => {
    handlerRef.current = handler;
  }, []);
  const jump = useCallback(() => handlerRef.current?.(), []);
  const value = useMemo(() => ({ register, jump }), [register, jump]);

  return (
    <JumpToNewActivityContext.Provider value={value}>{children}</JumpToNewActivityContext.Provider>
  );
};
JumpToNewActivityProvider.displayName = 'JumpToNewActivityProvider';

export const useJumpToNewActivity = (): (() => void) =>
  useContext(JumpToNewActivityContext)?.jump ?? noop;

export const useRegisterJumpToNewActivity = (handler: JumpHandler) => {
  const register = useContext(JumpToNewActivityContext)?.register;

  useEffect(() => {
    register?.(handler);
    return () => register?.(undefined);
  }, [register, handler]);
};

const noop = () => {};
