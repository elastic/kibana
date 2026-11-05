/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { EuiResizableButton } from '@elastic/eui';
import { css, type SerializedStyles } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const KEYBOARD_STEP = 20;
const KEYBOARD_LARGE_STEP = 100;

const RESIZE_LABEL = i18n.translate('xpack.notebook.cellResize.handleLabel', {
  defaultMessage: 'Resize cell',
});

interface CellResize {
  bodyCss: SerializedStyles;
  /** Rendered by `CellFrame` in place of the footer divider, so the cell keeps a single border. */
  resizeHandle: React.ReactNode;
}

/** A display height the user can drag taller, never below `defaultHeight`. */
export const useCellResize = (defaultHeight: number): CellResize => {
  const [chosenHeight, setChosenHeight] = useState<number>();
  const drag = useRef<{ startY: number; startHeight: number }>();
  const height = Math.max(chosenHeight ?? defaultHeight, defaultHeight);

  const resizeTo = (next: number) => setChosenHeight(Math.max(Math.round(next), defaultHeight));

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, startHeight: height };
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    const { startY, startHeight } = drag.current;
    resizeTo(startHeight + event.clientY - startY);
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = undefined;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? KEYBOARD_LARGE_STEP : KEYBOARD_STEP;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      resizeTo(height + step);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      resizeTo(height - step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      resizeTo(defaultHeight);
    }
  };

  return {
    bodyCss: css`
      height: ${height}px;
      overflow: hidden;
    `,
    resizeHandle: (
      <EuiResizableButton
        indicator="border"
        aria-label={RESIZE_LABEL}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        data-test-subj="notebookCellResizeHandle"
      />
    ),
  };
};
