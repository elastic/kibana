/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useState } from 'react';

export interface MenuRunParams {
  returnFocus: () => void;
}

export interface HeaderPanel {
  isOpen: boolean;
  open: (params?: MenuRunParams) => void;
  close: () => void;
}

/**
 * Open state for one flyout or modal the header opens. Each has its own, so EUI can stack the
 * flyouts. Menu items vanish once the menu closes, so closing returns focus to the menu.
 */
export const useHeaderPanel = (): HeaderPanel => {
  const [isOpen, setIsOpen] = useState(false);
  const returnFocusRef = useRef<() => void>();

  const open = (params?: MenuRunParams) => {
    returnFocusRef.current = params?.returnFocus;
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    returnFocusRef.current?.();
  };

  return { isOpen, open, close };
};
