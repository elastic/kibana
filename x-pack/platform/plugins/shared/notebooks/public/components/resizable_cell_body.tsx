/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const KEYBOARD_STEP = 20;
const KEYBOARD_LARGE_STEP = 100;

const RESIZE_LABEL = i18n.translate('xpack.notebook.resizableCellBody.handleLabel', {
  defaultMessage: 'Resize cell',
});

interface ResizableCellBodyProps {
  /** The starting height in pixels, which is also the smallest the body can be dragged to. */
  defaultHeight: number;
  children: React.ReactNode;
  'data-test-subj'?: string;
}

/** A cell display area the user can drag taller with a handle along its bottom edge. */
export const ResizableCellBody = ({
  defaultHeight,
  children,
  'data-test-subj': dataTestSubj,
}: ResizableCellBodyProps) => {
  const { euiTheme } = useEuiTheme();
  const [chosenHeight, setChosenHeight] = useState<number>();
  const drag = useRef<{ startY: number; startHeight: number }>();
  const height = Math.max(chosenHeight ?? defaultHeight, defaultHeight);

  const resizeTo = (next: number) => setChosenHeight(Math.max(Math.round(next), defaultHeight));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, startHeight: height };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const { startY, startHeight } = drag.current;
    resizeTo(startHeight + event.clientY - startY);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = undefined;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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

  const handleCss = css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: ${euiTheme.size.m};
    cursor: row-resize;
    touch-action: none;
    border-radius: ${euiTheme.border.radius.small};

    &::after {
      content: '';
      width: ${euiTheme.size.xl};
      height: ${euiTheme.size.xxs};
      border-radius: ${euiTheme.border.radius.small};
      background-color: ${euiTheme.colors.borderBaseProminent};
    }

    &:hover::after,
    &:focus-visible::after,
    &:active::after {
      background-color: ${euiTheme.colors.vis.euiColorVis0};
    }
  `;

  return (
    <div>
      <div
        css={css`
          height: ${height}px;
          overflow: hidden;
        `}
        data-test-subj={dataTestSubj}
      >
        {children}
      </div>
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label={RESIZE_LABEL}
        aria-valuemin={defaultHeight}
        aria-valuenow={height}
        tabIndex={0}
        css={handleCss}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        data-test-subj="notebookCellResizeHandle"
      />
    </div>
  );
};
