/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef } from 'react';
import { fromEvent, Observable, Subscription } from 'rxjs';
import { concatMap, takeUntil } from 'rxjs/operators';
import styled from 'styled-components';

export type OnResize = ({ delta, id }: { delta: number; id: string }) => void;

export const resizeCursorStyle = 'col-resize';
export const globalResizeCursorClassName = 'global-resize-cursor';

/** This polyfill is for Safari and IE-11 only. `movementX` is more accurate and "feels" better, so only use this function on Safari and IE-11 */
export const calculateDeltaX = ({ prevX, screenX }: { prevX: number; screenX: number }) =>
  prevX !== 0 ? screenX - prevX : 0;

const isSafari = /^((?!chrome|android|crios|fxios|Firefox).)*safari/i.test(navigator.userAgent);

interface ResizeHandleContainerProps {
  bottom?: string | number;
  /** optionally provide a height style ResizeHandleContainer */
  height?: string;
  left?: string | number;
  positionAbsolute?: boolean;
  right?: string | number;
  top?: string | number;
}

interface Props extends ResizeHandleContainerProps {
  /** a (styled) resize handle */
  handle: React.ReactNode;
  /** the `onResize` callback will be invoked with this id */
  id: string;
  /** invoked when the handle is resized */
  onResize: OnResize;
  /** The resizeable content to render */
  render: (isResizing: boolean) => React.ReactNode;
}

const ResizeHandleContainer = styled.div<ResizeHandleContainerProps>`
  bottom: ${({ positionAbsolute, bottom }) => positionAbsolute && bottom};
  cursor: ${resizeCursorStyle};
  height: ${({ height }) => height};
  left: ${({ positionAbsolute, left }) => positionAbsolute && left};
  position: ${({ positionAbsolute }) => positionAbsolute && 'absolute'};
  right: ${({ positionAbsolute, right }) => positionAbsolute && right};
  top: ${({ positionAbsolute, top }) => positionAbsolute && top};
  z-index: ${({ positionAbsolute, theme }) => positionAbsolute && theme.eui.euiZLevel1};
`;
ResizeHandleContainer.displayName = 'ResizeHandleContainer';

export const addGlobalResizeCursorStyleToBody = () => {
  document.body.classList.add(globalResizeCursorClassName);
};

export const removeGlobalResizeCursorStyleFromBody = () => {
  document.body.classList.remove(globalResizeCursorClassName);
};

export const Resizeable = React.memo<Props>(
  ({ bottom, handle, height, id, left, onResize, positionAbsolute, render, right, top }) => {
    const drag$ = useRef<Observable<MouseEvent> | null>(null);
    const dragEventTargets = useRef<Array<{ htmlElement: HTMLElement; prevCursor: string }>>([]);
    const dragSubscription = useRef<Subscription | null>(null);
    const prevX = useRef(0);
    const ref = useRef(null);
    const upSubscription = useRef<Subscription | null>(null);
    const isResizingRef = useRef(false);

    const calculateDelta = (e: MouseEvent) => {
      const deltaX = calculateDeltaX({ prevX: prevX.current, screenX: e.screenX });
      prevX.current = e.screenX;
      return deltaX;
    };
    useEffect(() => {
      const move$ = fromEvent<MouseEvent>(document, 'mousemove');
      const down$ = fromEvent<MouseEvent>(ref.current!, 'mousedown');
      const up$ = fromEvent<MouseEvent>(document, 'mouseup');

      drag$.current = down$.pipe(concatMap(() => move$.pipe(takeUntil(up$))));
      dragSubscription.current =
        drag$.current &&
        drag$.current.subscribe(event => {
          // We do a feature detection of event.movementX here and if it is missing
          // we calculate the delta manually. Browsers IE-11 and Safari will call calculateDelta
          const delta =
            event.movementX == null || isSafari ? calculateDelta(event) : event.movementX;
          if (!isResizingRef.current) {
            isResizingRef.current = true;
          }
          onResize({ id, delta });
          if (event.target != null && event.target instanceof HTMLElement) {
            const htmlElement: HTMLElement = event.target;
            dragEventTargets.current = [
              ...dragEventTargets.current,
              { htmlElement, prevCursor: htmlElement.style.cursor },
            ];
            htmlElement.style.cursor = resizeCursorStyle;
          }
        });

      upSubscription.current = up$.subscribe(() => {
        if (isResizingRef.current) {
          dragEventTargets.current.reverse().forEach(eventTarget => {
            eventTarget.htmlElement.style.cursor = eventTarget.prevCursor;
          });
          dragEventTargets.current = [];
          isResizingRef.current = false;
        }
      });
      return () => {
        if (dragSubscription.current != null) {
          dragSubscription.current.unsubscribe();
        }
        if (upSubscription.current != null) {
          upSubscription.current.unsubscribe();
        }
      };
    }, []);

    return (
      <>
        {render(isResizingRef.current)}
        <ResizeHandleContainer
          bottom={bottom}
          data-test-subj="resize-handle-container"
          height={height}
          ref={ref}
          left={left}
          positionAbsolute={positionAbsolute}
          right={right}
          top={top}
        >
          {handle}
        </ResizeHandleContainer>
      </>
    );
  }
);

Resizeable.displayName = 'Resizeable';
