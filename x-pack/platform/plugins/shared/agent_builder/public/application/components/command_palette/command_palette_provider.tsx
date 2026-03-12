/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';
import { EuiWindowEvent } from '@elastic/eui';
import { isMac } from '@kbn/shared-ux-utility';
import { CommandPaletteModal } from './command_palette_modal';

interface CommandPaletteState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteState | null>(null);

interface CommandPaletteProviderProps {
  children: React.ReactNode;
}

export const CommandPaletteProvider: React.FC<CommandPaletteProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isMetaOrCtrl = isMac ? event.metaKey : event.ctrlKey;
      if (event.key === 'k' && isMetaOrCtrl) {
        event.preventDefault();
        toggle();
      }
    },
    [toggle]
  );

  return (
    <CommandPaletteContext.Provider value={{ isOpen, open, close, toggle }}>
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      {children}
      {isOpen && <CommandPaletteModal onClose={close} />}
    </CommandPaletteContext.Provider>
  );
};

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }
  return context;
}
