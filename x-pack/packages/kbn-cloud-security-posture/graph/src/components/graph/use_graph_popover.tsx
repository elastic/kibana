/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

export interface PopoverActions {
  openPopover: (anchorElement: HTMLElement) => void;
  closePopover: () => void;
}

export interface PopoverState {
  isOpen: boolean;
  anchorElement: HTMLElement | null;
}

export interface GraphPopoverState {
  id: string;
  actions: PopoverActions;
  state: PopoverState;
}

export const useGraphPopover = (id: string): GraphPopoverState => {
  const [isOpen, setIsOpen] = useState(false);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

  // Memoize actions to prevent them from changing on re-renders
  const openPopover = useCallback((anchor: HTMLElement) => {
    setAnchorElement(anchor);
    setIsOpen(true);
  }, []);

  const closePopover = useCallback(() => {
    setIsOpen(false);
    setAnchorElement(null);
  }, []);

  // Memoize the context values
  const actions: PopoverActions = useMemo(
    () => ({ openPopover, closePopover }),
    [openPopover, closePopover]
  );

  const state: PopoverState = useMemo(() => ({ isOpen, anchorElement }), [isOpen, anchorElement]);

  return useMemo(
    () => ({
      id,
      actions,
      state,
    }),
    [id, actions, state]
  );
};
