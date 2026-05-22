/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useRef } from 'react';
import { coreServices } from '../../../services/kibana_services';
import { ShortcutStrings } from '../../../../i18n/shortcuts';
import { forceReload } from '../../hooks/use_canvas_api';

const shortcutHelp = ShortcutStrings.getShortcutHelp();
const namespaceDisplayNames = ShortcutStrings.getNamespaceDisplayNames();

interface ChildrenProps {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

interface Props {
  isFullscreen: boolean;
  setFullscreen: (fullscreen: boolean) => void;

  autoplayEnabled: boolean;
  toggleAutoplay: () => void;

  onPageChange: (pageNumber: number) => void;
  previousPage: () => void;
  nextPage: () => void;

  fetchAllRenderables: () => void;

  children: (props: ChildrenProps) => ReactNode;
}

export const FullscreenControl: React.FC<Props> = ({
  isFullscreen,
  setFullscreen,
  toggleAutoplay,
  previousPage,
  nextPage,
  fetchAllRenderables,
  children,
}) => {
  const propsRef = useRef({
    isFullscreen,
    setFullscreen,
    toggleAutoplay,
    previousPage,
    nextPage,
    fetchAllRenderables,
  });
  propsRef.current = {
    isFullscreen,
    setFullscreen,
    toggleAutoplay,
    previousPage,
    nextPage,
    fetchAllRenderables,
  };

  const toggleFullscreen = useCallback(() => {
    setFullscreen(!isFullscreen);
  }, [isFullscreen, setFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const group = namespaceDisplayNames.PRESENTATION;
    return coreServices.hotkeys.registerMany([
      {
        def: {
          id: 'canvas:presentation.refresh',
          keys: 'Alt+R',
          label: shortcutHelp.REFRESH,
          scope: 'context',
          group,
        },
        handler: () => {
          forceReload();
          propsRef.current.fetchAllRenderables();
        },
      },
      {
        def: {
          id: 'canvas:presentation.prevPage',
          keys: 'Alt+[',
          label: shortcutHelp.PREV,
          scope: 'context',
          group,
        },
        handler: () => {
          propsRef.current.previousPage();
        },
      },
      {
        def: {
          id: 'canvas:presentation.prevPageBackspace',
          keys: 'Backspace',
          label: shortcutHelp.PREV,
          scope: 'context',
          group,
        },
        handler: () => {
          propsRef.current.previousPage();
        },
      },
      {
        def: {
          id: 'canvas:presentation.prevPageLeft',
          keys: 'ArrowLeft',
          label: shortcutHelp.PREV,
          scope: 'context',
          group,
        },
        handler: () => {
          propsRef.current.previousPage();
        },
      },
      {
        def: {
          id: 'canvas:presentation.nextPage',
          keys: 'Alt+]',
          label: shortcutHelp.NEXT,
          scope: 'context',
          group,
        },
        handler: () => {
          propsRef.current.nextPage();
        },
      },
      {
        def: {
          id: 'canvas:presentation.nextPageSpace',
          keys: 'Space',
          label: shortcutHelp.NEXT,
          scope: 'context',
          group,
        },
        handler: () => {
          propsRef.current.nextPage();
        },
      },
      {
        def: {
          id: 'canvas:presentation.nextPageRight',
          keys: 'ArrowRight',
          label: shortcutHelp.NEXT,
          scope: 'context',
          group,
        },
        handler: () => {
          propsRef.current.nextPage();
        },
      },
      {
        def: {
          id: 'canvas:presentation.fullscreen',
          keys: 'Alt+F',
          label: shortcutHelp.FULLSCREEN,
          scope: 'context',
          group,
        },
        handler: () => {
          propsRef.current.setFullscreen(!propsRef.current.isFullscreen);
        },
      },
      {
        def: {
          id: 'canvas:presentation.fullscreenAlt',
          keys: 'Alt+P',
          label: shortcutHelp.FULLSCREEN,
          scope: 'context',
          group,
        },
        handler: () => {
          propsRef.current.setFullscreen(!propsRef.current.isFullscreen);
        },
      },
      {
        def: {
          id: 'canvas:presentation.exitFullscreen',
          keys: 'Escape',
          label: shortcutHelp.FULLSCREEN_EXIT,
          scope: 'context',
          group,
        },
        handler: () => {
          propsRef.current.setFullscreen(!propsRef.current.isFullscreen);
        },
      },
      {
        def: {
          id: 'canvas:presentation.pageCycleToggle',
          keys: 'P',
          label: shortcutHelp.PAGE_CYCLE_TOGGLE,
          scope: 'context',
          group,
        },
        handler: () => {
          propsRef.current.toggleAutoplay();
        },
      },
    ]);
  }, [isFullscreen]);

  return <span>{children({ isFullscreen, toggleFullscreen })}</span>;
};
