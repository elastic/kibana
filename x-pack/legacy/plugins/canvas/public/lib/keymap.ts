/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapValues } from 'lodash';
import { ELEMENT_NUDGE_OFFSET, ELEMENT_SHIFT_OFFSET } from '../../common/lib/constants';

export interface ShortcutMap {
  osx: string[];
  windows: string[];
  linux: string[];
  other: string[];
  help: string;
}

export interface ShortcutNameSpace {
  displayName: string;
  [shortcut: string]: string | ShortcutMap;
}

interface KeyMap {
  [category: string]: ShortcutNameSpace;
}
type Modifier = 'ctrl' | 'command' | 'shift' | 'alt' | 'option';

// maps key for all OS's with optional modifiers
const getShortcuts = (
  shortcuts: string | string[],
  { modifiers = [], help }: { modifiers?: Modifier | Modifier[]; help: string }
): ShortcutMap => {
  // normalize shortcut values
  if (!Array.isArray(shortcuts)) {
    shortcuts = [shortcuts];
  }

  // normalize modifier values
  if (!Array.isArray(modifiers)) {
    modifiers = [modifiers];
  }

  let macShortcuts = [...shortcuts];

  // handle shift modifier
  if (modifiers.includes('shift')) {
    macShortcuts = macShortcuts.map(shortcut => `shift+${shortcut}`);
    shortcuts = shortcuts.map(shortcut => `shift+${shortcut}`);
  }

  // handle alt modifier
  if (modifiers.includes('alt') || modifiers.includes('option')) {
    macShortcuts = macShortcuts.map(shortcut => `option+${shortcut}`);
    shortcuts = shortcuts.map(shortcut => `alt+${shortcut}`);
  }

  // handle ctrl modifier
  if (modifiers.includes('ctrl') || modifiers.includes('command')) {
    macShortcuts = macShortcuts.map(shortcut => `command+${shortcut}`);
    shortcuts = shortcuts.map(shortcut => `ctrl+${shortcut}`);
  }

  return {
    osx: macShortcuts,
    windows: shortcuts,
    linux: shortcuts,
    other: shortcuts,
    help,
  };
};

const refreshShortcut = getShortcuts('r', { modifiers: 'alt', help: 'Refresh workpad' });
const previousPageShortcut = getShortcuts('[', { modifiers: 'alt', help: 'Go to previous page' });
const nextPageShortcut = getShortcuts(']', { modifiers: 'alt', help: 'Go to next page' });

export const keymap: KeyMap = {
  ELEMENT: {
    displayName: 'Element controls',
    CUT: getShortcuts('x', { modifiers: 'ctrl', help: 'Cut' }),
    COPY: getShortcuts('c', { modifiers: 'ctrl', help: 'Copy' }),
    PASTE: getShortcuts('v', { modifiers: 'ctrl', help: 'Paste' }),
    CLONE: getShortcuts('d', { modifiers: 'ctrl', help: 'Clone' }),
    DELETE: getShortcuts(['del', 'backspace'], { help: 'Delete' }),
    BRING_FORWARD: getShortcuts('up', { modifiers: 'ctrl', help: 'Bring to front' }),
    BRING_TO_FRONT: getShortcuts('up', { modifiers: ['ctrl', 'shift'], help: 'Bring forward' }),
    SEND_BACKWARD: getShortcuts('down', { modifiers: 'ctrl', help: 'Send backward' }),
    SEND_TO_BACK: getShortcuts('down', { modifiers: ['ctrl', 'shift'], help: 'Send to back' }),
    GROUP: getShortcuts('g', { help: 'Group' }),
    UNGROUP: getShortcuts('u', { help: 'Ungroup' }),
    SHIFT_UP: getShortcuts('up', { help: `Shift up by ${ELEMENT_SHIFT_OFFSET}px` }),
    SHIFT_DOWN: getShortcuts('down', { help: `Shift down by ${ELEMENT_SHIFT_OFFSET}px` }),
    SHIFT_LEFT: getShortcuts('left', { help: `Shift left by ${ELEMENT_SHIFT_OFFSET}px` }),
    SHIFT_RIGHT: getShortcuts('right', { help: `Shift right by ${ELEMENT_SHIFT_OFFSET}px` }),
    NUDGE_UP: getShortcuts('up', {
      modifiers: ['shift'],
      help: `Shift up by ${ELEMENT_NUDGE_OFFSET}px`,
    }),
    NUDGE_DOWN: getShortcuts('down', {
      modifiers: ['shift'],
      help: `Shift down by ${ELEMENT_NUDGE_OFFSET}px`,
    }),
    NUDGE_LEFT: getShortcuts('left', {
      modifiers: ['shift'],
      help: `Shift left by ${ELEMENT_NUDGE_OFFSET}px`,
    }),
    NUDGE_RIGHT: getShortcuts('right', {
      modifiers: ['shift'],
      help: `Shift right by ${ELEMENT_NUDGE_OFFSET}px`,
    }),
  },
  EXPRESSION: {
    displayName: 'Expression controls',
    RUN: getShortcuts('enter', { modifiers: 'ctrl', help: 'Run whole expression' }),
  },
  EDITOR: {
    displayName: 'Editor controls',
    // added for documentation purposes, not handled by `react-shortcuts`
    MULTISELECT: getShortcuts('click', { modifiers: 'shift', help: 'Select multiple elements' }),
    // added for documentation purposes, not handled by `react-shortcuts`
    RESIZE_FROM_CENTER: getShortcuts('drag', {
      modifiers: 'alt',
      help: 'Resize from center',
    }),
    // added for documentation purposes, not handled by `react-shortcuts`
    IGNORE_SNAP: getShortcuts('drag', {
      modifiers: 'ctrl',
      help: 'Move, resize, and rotate without snapping',
    }),
    // added for documentation purposes, not handled by `react-shortcuts`
    SELECT_BEHIND: getShortcuts('click', {
      modifiers: 'ctrl',
      help: 'Select element below',
    }),
    UNDO: getShortcuts('z', { modifiers: 'ctrl', help: 'Undo last action' }),
    REDO: getShortcuts('z', { modifiers: ['ctrl', 'shift'], help: 'Redo last action' }),
    PREV: previousPageShortcut,
    NEXT: nextPageShortcut,
    EDITING: getShortcuts('e', { modifiers: 'alt', help: 'Toggle edit mode' }),
    GRID: getShortcuts('g', { modifiers: 'alt', help: 'Show grid' }),
    REFRESH: refreshShortcut,
    ZOOM_IN: getShortcuts('plus', { modifiers: ['ctrl', 'alt'], help: 'Zoom in' }),
    ZOOM_OUT: getShortcuts('minus', { modifiers: ['ctrl', 'alt'], help: 'Zoom out' }),
    ZOOM_RESET: getShortcuts('[', { modifiers: ['ctrl', 'alt'], help: 'Reset zoom to 100%' }),
  },
  PRESENTATION: {
    displayName: 'Presentation controls',
    FULLSCREEN: getShortcuts(['f', 'p'], { modifiers: 'alt', help: 'Enter presentation mode' }),
    FULLSCREEN_EXIT: getShortcuts('esc', { help: 'Exit presentation mode' }),
    PREV: mapValues(previousPageShortcut, (osShortcuts: string[], key?: string) =>
      // adds 'backspace' and 'left' to list of shortcuts per OS
      key === 'help' ? osShortcuts : osShortcuts.concat(['backspace', 'left'])
    ),
    NEXT: mapValues(nextPageShortcut, (osShortcuts: string[], key?: string) =>
      // adds 'space' and 'right' to list of shortcuts per OS
      key === 'help' ? osShortcuts : osShortcuts.concat(['space', 'right'])
    ),
    REFRESH: refreshShortcut,
    PAGE_CYCLE_TOGGLE: getShortcuts('p', { help: 'Toggle page cycling' }),
  },
};
