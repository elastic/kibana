/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useState } from 'react';
import { INITIAL_EDITOR_HEIGHT, MAX_EDITOR_HEIGHT, MIN_EDITOR_HEIGHT } from './constants';

const KEYBOARD_RESIZE_STEP = 16;

/**
 * Pointer + keyboard resize for the sandbox Monaco viewport.
 * Caps height so the flyout can keep scrolling the results table.
 */
export const useEditorHeightResize = () => {
  const [editorHeight, setEditorHeight] = useState(INITIAL_EDITOR_HEIGHT);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const onResizePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dragRef.current = {
      startY: event.clientY,
      startHeight: editorHeight,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onResizePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    const nextHeight = drag.startHeight + (event.clientY - drag.startY);
    setEditorHeight(Math.min(MAX_EDITOR_HEIGHT, Math.max(MIN_EDITOR_HEIGHT, nextHeight)));
  };

  const onResizePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) {
      return;
    }
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onResizeKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setEditorHeight((height) => Math.max(MIN_EDITOR_HEIGHT, height - KEYBOARD_RESIZE_STEP));
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setEditorHeight((height) => Math.min(MAX_EDITOR_HEIGHT, height + KEYBOARD_RESIZE_STEP));
    }
  };

  return {
    editorHeight,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
    onResizeKeyDown,
  };
};
