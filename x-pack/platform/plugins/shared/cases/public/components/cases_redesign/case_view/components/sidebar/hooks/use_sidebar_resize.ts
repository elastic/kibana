/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { LOCAL_STORAGE_KEYS } from '../../../../../../../common/constants';
import { useCasesLocalStorage } from '../../../../../../common/use_cases_local_storage';

export const MIN_SIDEBAR_WIDTH = 280;
export const MAX_SIDEBAR_WIDTH = 620;
export const DEFAULT_SIDEBAR_WIDTH = 360;

/** Pixels moved per arrow-key press, matching EuiResizableContainer's keyboard step. */
const KEYBOARD_STEP = 10;

export const clampSidebarWidth = (width: number): number =>
  Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)));

/**
 * Drag/keyboard resizing for the case view sidebar, with the chosen width persisted per solution.
 *
 * The width is tracked on a ref during a drag and written to the DOM directly, so a pointer move
 * does not re-render the case view (which mounts embeddable attachments); React state and local
 * storage are only updated when the drag ends.
 */
export const useSidebarResize = () => {
  const [storedWidth, setStoredWidth] = useCasesLocalStorage<number>(
    LOCAL_STORAGE_KEYS.caseViewSidebarWidth,
    DEFAULT_SIDEBAR_WIDTH
  );

  const width = clampSidebarWidth(storedWidth ?? DEFAULT_SIDEBAR_WIDTH);

  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ startX: number; startWidth: number; width: number } | null>(null);

  const applyWidth = useCallback((nextWidth: number) => {
    if (sidebarRef.current) {
      sidebarRef.current.style.flexBasis = `${nextWidth}px`;
    }
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      // Dragging left grows the sidebar: it is anchored to the end of the row.
      const next = clampSidebarWidth(dragState.startWidth + (dragState.startX - event.clientX));
      dragState.width = next;
      applyWidth(next);
    },
    [applyWidth]
  );

  const onPointerUp = useCallback(() => {
    const dragState = dragStateRef.current;
    dragStateRef.current = null;
    if (dragState) {
      setStoredWidth(dragState.width);
    }
  }, [setStoredWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      dragStateRef.current = { startX: event.clientX, startWidth: width, width };
    },
    [width]
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }

      event.preventDefault();
      const delta = event.key === 'ArrowLeft' ? KEYBOARD_STEP : -KEYBOARD_STEP;
      setStoredWidth(clampSidebarWidth(width + delta));
    },
    [setStoredWidth, width]
  );

  return { width, sidebarRef, onPointerDown, onKeyDown };
};
