/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useEffect, useRef } from 'react';
import { isTextInput } from '../../lib/is_text_input';
import { coreServices } from '../../services/kibana_services';
import { ShortcutStrings } from '../../../i18n/shortcuts';

const shortcutHelp = ShortcutStrings.getShortcutHelp();
const namespaceDisplayNames = ShortcutStrings.getNamespaceDisplayNames();

export interface Props {
  /**
   * cuts selected elements
   */
  cutNodes: () => void;
  /**
   * copies selected elements to clipboard
   */
  copyNodes: () => void;
  /**
   * pastes elements stored in clipboard to page
   */
  pasteNodes: () => void;
  /**
   * clones selected elements
   */
  cloneNodes: () => void;
  /**
   * deletes selected elements
   */
  deleteNodes: () => void;
  /**
   * moves selected element to top layer
   */
  bringToFront: () => void;
  /**
   * moves selected element up one layer
   */
  bringForward: () => void;
  /**
   * moves selected element down one layer
   */
  sendBackward: () => void;
  /**
   * moves selected element to bottom layer
   */
  sendToBack: () => void;
  /**
   * groups selected elements
   */
  groupNodes: () => void;
  /**
   * ungroups selected group
   */
  ungroupNodes: () => void;
  /**
   * shifts selected elements 10px up
   */
  shiftUp: () => void;
  /**
   * shifts selected elements 10px down
   */
  shiftDown: () => void;
  /**
   * shifts selected elements 10px left
   */
  shiftLeft: () => void;
  /**
   * shifts selected elements 10px right
   */
  shiftRight: () => void;
  /**
   * nudges selected elements 1px up
   */
  nudgeUp: () => void;
  /**
   * nudges selected elements 1px down
   */
  nudgeDown: () => void;
  /**
   * nudges selected elements 1px left
   */
  nudgeLeft: () => void;
  /**
   * nudges selected elements 1px right
   */
  nudgeRight: () => void;
}

export const WorkpadShortcuts: React.FC<Props> = (props) => {
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const group = namespaceDisplayNames.ELEMENT;
    return coreServices.hotkeys.forApp('canvas').registerMany([
      {
        def: { id: 'canvas:element.cut', keys: 'Mod+X', label: shortcutHelp.CUT, group },
        handler: (event) => {
          if (isTextInput(event.target as HTMLInputElement)) return;
          event.preventDefault();
          propsRef.current.cutNodes();
        },
      },
      {
        def: { id: 'canvas:element.copy', keys: 'Mod+C', label: shortcutHelp.COPY, group },
        handler: (event) => {
          if (isTextInput(event.target as HTMLInputElement)) return;
          event.preventDefault();
          propsRef.current.copyNodes();
        },
      },
      {
        def: { id: 'canvas:element.paste', keys: 'Mod+V', label: shortcutHelp.PASTE, group },
        handler: (event) => {
          if (isTextInput(event.target as HTMLInputElement)) return;
          event.preventDefault();
          propsRef.current.pasteNodes();
        },
      },
      {
        def: { id: 'canvas:element.clone', keys: 'Mod+D', label: shortcutHelp.CLONE, group },
        handler: (event) => {
          if (isTextInput(event.target as HTMLInputElement)) return;
          event.preventDefault();
          propsRef.current.cloneNodes();
        },
      },
      {
        def: { id: 'canvas:element.delete', keys: 'Delete', label: shortcutHelp.DELETE, group },
        handler: (event) => {
          event.preventDefault();
          propsRef.current.deleteNodes();
        },
      },
      {
        def: {
          id: 'canvas:element.deleteAlt',
          keys: 'Backspace',
          label: shortcutHelp.DELETE,
          group,
        },
        handler: (event) => {
          event.preventDefault();
          propsRef.current.deleteNodes();
        },
      },
      {
        def: {
          id: 'canvas:element.bringForward',
          keys: 'Mod+ArrowUp',
          label: shortcutHelp.BRING_FORWARD,
          group,
        },
        handler: (event) => {
          if (isTextInput(event.target as HTMLInputElement)) return;
          event.preventDefault();
          propsRef.current.bringForward();
        },
      },
      {
        def: {
          id: 'canvas:element.bringToFront',
          keys: 'Mod+Shift+ArrowUp',
          label: shortcutHelp.BRING_TO_FRONT,
          group,
        },
        handler: (event) => {
          if (isTextInput(event.target as HTMLInputElement)) return;
          event.preventDefault();
          propsRef.current.bringToFront();
        },
      },
      {
        def: {
          id: 'canvas:element.sendBackward',
          keys: 'Mod+ArrowDown',
          label: shortcutHelp.SEND_BACKWARD,
          group,
        },
        handler: (event) => {
          if (isTextInput(event.target as HTMLInputElement)) return;
          event.preventDefault();
          propsRef.current.sendBackward();
        },
      },
      {
        def: {
          id: 'canvas:element.sendToBack',
          keys: 'Mod+Shift+ArrowDown',
          label: shortcutHelp.SEND_TO_BACK,
          group,
        },
        handler: (event) => {
          if (isTextInput(event.target as HTMLInputElement)) return;
          event.preventDefault();
          propsRef.current.sendToBack();
        },
      },
      {
        def: { id: 'canvas:element.group', keys: 'G', label: shortcutHelp.GROUP, group },
        handler: (event) => {
          event.preventDefault();
          propsRef.current.groupNodes();
        },
      },
      {
        def: { id: 'canvas:element.ungroup', keys: 'U', label: shortcutHelp.UNGROUP, group },
        handler: (event) => {
          event.preventDefault();
          propsRef.current.ungroupNodes();
        },
      },
      {
        def: { id: 'canvas:element.shiftUp', keys: 'ArrowUp', label: shortcutHelp.SHIFT_UP, group },
        handler: (event) => {
          event.preventDefault();
          propsRef.current.shiftUp();
        },
      },
      {
        def: {
          id: 'canvas:element.shiftDown',
          keys: 'ArrowDown',
          label: shortcutHelp.SHIFT_DOWN,
          group,
        },
        handler: (event) => {
          event.preventDefault();
          propsRef.current.shiftDown();
        },
      },
      {
        def: {
          id: 'canvas:element.shiftLeft',
          keys: 'ArrowLeft',
          label: shortcutHelp.SHIFT_LEFT,
          group,
        },
        handler: (event) => {
          event.preventDefault();
          propsRef.current.shiftLeft();
        },
      },
      {
        def: {
          id: 'canvas:element.shiftRight',
          keys: 'ArrowRight',
          label: shortcutHelp.SHIFT_RIGHT,
          group,
        },
        handler: (event) => {
          event.preventDefault();
          propsRef.current.shiftRight();
        },
      },
      {
        def: {
          id: 'canvas:element.nudgeUp',
          keys: 'Shift+ArrowUp',
          label: shortcutHelp.NUDGE_UP,
          group,
        },
        handler: (event) => {
          event.preventDefault();
          propsRef.current.nudgeUp();
        },
      },
      {
        def: {
          id: 'canvas:element.nudgeDown',
          keys: 'Shift+ArrowDown',
          label: shortcutHelp.NUDGE_DOWN,
          group,
        },
        handler: (event) => {
          event.preventDefault();
          propsRef.current.nudgeDown();
        },
      },
      {
        def: {
          id: 'canvas:element.nudgeLeft',
          keys: 'Shift+ArrowLeft',
          label: shortcutHelp.NUDGE_LEFT,
          group,
        },
        handler: (event) => {
          event.preventDefault();
          propsRef.current.nudgeLeft();
        },
      },
      {
        def: {
          id: 'canvas:element.nudgeRight',
          keys: 'Shift+ArrowRight',
          label: shortcutHelp.NUDGE_RIGHT,
          group,
        },
        handler: (event) => {
          event.preventDefault();
          propsRef.current.nudgeRight();
        },
      },
    ]);
  }, []);

  return null;
};
