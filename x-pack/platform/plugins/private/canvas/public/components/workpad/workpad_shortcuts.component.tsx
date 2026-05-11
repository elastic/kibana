/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type React from 'react';
import { useEffect, useRef } from 'react';
import { isTextInput } from '../../lib/is_text_input';
import type { Props } from './workpad.component';
import { forceReload } from '../hooks/use_canvas_api';
import { coreServices } from '../../services/kibana_services';
import { ShortcutStrings } from '../../../i18n/shortcuts';

const shortcutHelp = ShortcutStrings.getShortcutHelp();
const namespaceDisplayNames = ShortcutStrings.getNamespaceDisplayNames();

type ShortcutProps = Pick<
  Props,
  | 'fetchAllRenderables'
  | 'undoHistory'
  | 'redoHistory'
  | 'setGrid'
  | 'grid'
  | 'zoomIn'
  | 'zoomOut'
  | 'resetZoom'
  | 'previousPage'
  | 'nextPage'
  | 'setFullscreen'
  | 'isFullscreen'
>;

export const WorkpadShortcuts: React.FC<ShortcutProps> = (props) => {
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const group = namespaceDisplayNames.EDITOR;
    return coreServices.hotkeys.forApp('canvas').registerMany([
      {
        def: { id: 'canvas:editor.refresh', keys: 'Alt+R', label: shortcutHelp.REFRESH, group },
        handler: () => {
          forceReload();
          propsRef.current.fetchAllRenderables();
        },
      },
      {
        def: { id: 'canvas:editor.undo', keys: 'Mod+Z', label: shortcutHelp.UNDO, group },
        handler: (event) => {
          if (isTextInput(event.target as HTMLInputElement)) return;
          event.preventDefault();
          propsRef.current.undoHistory();
        },
      },
      {
        def: {
          id: 'canvas:editor.redo',
          keys: 'Mod+Shift+Z',
          label: shortcutHelp.REDO,
          group,
        },
        handler: (event) => {
          if (isTextInput(event.target as HTMLInputElement)) return;
          event.preventDefault();
          propsRef.current.redoHistory();
        },
      },
      {
        def: { id: 'canvas:editor.grid', keys: 'Alt+G', label: shortcutHelp.GRID, group },
        handler: () => {
          propsRef.current.setGrid(!propsRef.current.grid);
        },
      },
      {
        def: { id: 'canvas:editor.zoomIn', keys: 'Mod+Alt+=', label: shortcutHelp.ZOOM_IN, group },
        handler: (event) => {
          if (isTextInput(event.target as HTMLInputElement)) return;
          event.preventDefault();
          propsRef.current.zoomIn();
        },
      },
      {
        def: {
          id: 'canvas:editor.zoomOut',
          keys: 'Mod+Alt+-',
          label: shortcutHelp.ZOOM_OUT,
          group,
        },
        handler: (event) => {
          if (isTextInput(event.target as HTMLInputElement)) return;
          event.preventDefault();
          propsRef.current.zoomOut();
        },
      },
      {
        def: {
          id: 'canvas:editor.zoomReset',
          keys: 'Mod+Alt+[',
          label: shortcutHelp.ZOOM_RESET,
          group,
        },
        handler: (event) => {
          if (isTextInput(event.target as HTMLInputElement)) return;
          event.preventDefault();
          propsRef.current.resetZoom();
        },
      },
      {
        def: { id: 'canvas:editor.prevPage', keys: 'Alt+[', label: shortcutHelp.PREV, group },
        handler: () => {
          propsRef.current.previousPage();
        },
      },
      {
        def: { id: 'canvas:editor.nextPage', keys: 'Alt+]', label: shortcutHelp.NEXT, group },
        handler: () => {
          propsRef.current.nextPage();
        },
      },
      {
        def: {
          id: 'canvas:editor.fullscreen',
          keys: 'Alt+F',
          label: shortcutHelp.FULLSCREEN,
          group,
        },
        handler: () => {
          propsRef.current.setFullscreen(!propsRef.current.isFullscreen);
        },
      },
      {
        def: {
          id: 'canvas:editor.fullscreenAlt',
          keys: 'Alt+P',
          label: shortcutHelp.FULLSCREEN,
          group,
        },
        handler: () => {
          propsRef.current.setFullscreen(!propsRef.current.isFullscreen);
        },
      },
    ]);
  }, []);

  return null;
};
