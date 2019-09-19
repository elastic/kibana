/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { fromEvent, Observable, Subscription } from 'rxjs';
import { concatMap, takeUntil } from 'rxjs/operators';
import styled, { css } from 'styled-components';

export type OnResize = ({ delta, id }: { delta: number; id: string }) => void;

export const resizeCursorStyle = 'col-resize';
export const globalResizeCursorClassName = 'global-resize-cursor';

/** This polyfill is for Safari and IE-11 only. `movementX` is more accurate and "feels" better, so only use this function on Safari and IE-11 */
export const calculateDeltaX = ({ prevX, screenX }: { prevX: number; screenX: number }) =>
  prevX !== 0 ? screenX - prevX : 0;

const isSafari = /^((?!chrome|android|crios|fxios|Firefox).)*safari/i.test(navigator.userAgent);

interface Props {
  bottom?: string | number;
  /** a (styled) resize handle */
  handle: React.ReactNode;
  /** optionally provide a height style ResizeHandleContainer */
  height?: string;
  /** the `onResize` callback will be invoked with this id */
  id: string;
  left?: string | number;
  /** invoked when the handle is resized */
  onResize: OnResize;
  /** The resizeable content to render */
  position?: string;
  render: (isResizing: boolean) => React.ReactNode;
  right?: string | number;
  top?: string | number;
}

interface State {
  isResizing: boolean;
}

const ResizeHandleContainer = styled.div<{
  bottom?: string | number;
  height?: string;
  left?: string | number;
  position?: string;
  right?: string | number;
  top?: string | number;
}>`
  ${({ bottom, height, left, position, right, theme, top }) => css`
    bottom: ${bottom};
    cursor: ${resizeCursorStyle};
    height: ${height};
    left: ${left};
    position: ${position};
    right: ${right};
    top: ${top};
    z-index: ${(position === 'absolute' || position === 'relative') && theme.eui.euiZLevel1};
  `}
`;
ResizeHandleContainer.displayName = 'ResizeHandleContainer';

export const addGlobalResizeCursorStyleToBody = () => {
  document.body.classList.add(globalResizeCursorClassName);
};

export const removeGlobalResizeCursorStyleFromBody = () => {
  document.body.classList.remove(globalResizeCursorClassName);
};

export class Resizeable extends React.PureComponent<Props, State> {
  private drag$: Observable<MouseEvent> | null;
  private dragEventTargets: Array<{ htmlElement: HTMLElement; prevCursor: string }>;
  private dragSubscription: Subscription | null;
  private prevX: number = 0;
  private ref: React.RefObject<HTMLElement>;
  private upSubscription: Subscription | null;

  constructor(props: Props) {
    super(props);

    // NOTE: the ref and observable below are NOT stored in component `State`
    this.ref = React.createRef<HTMLElement>();
    this.drag$ = null;
    this.dragSubscription = null;
    this.upSubscription = null;
    this.dragEventTargets = [];

    this.state = {
      isResizing: false,
    };
  }

  public componentDidMount() {
    const { id, onResize } = this.props;

    const move$ = fromEvent<MouseEvent>(document, 'mousemove');
    const down$ = fromEvent<MouseEvent>(this.ref.current!, 'mousedown');
    const up$ = fromEvent<MouseEvent>(document, 'mouseup');

    this.drag$ = down$.pipe(concatMap(() => move$.pipe(takeUntil(up$))));
    this.dragSubscription = this.drag$.subscribe(event => {
      // We do a feature detection of event.movementX here and if it is missing
      // we calculate the delta manually. Browsers IE-11 and Safari will call calculateDelta
      const delta =
        event.movementX == null || isSafari ? this.calculateDelta(event) : event.movementX;
      if (!this.state.isResizing) {
        this.setState({ isResizing: true });
      }
      onResize({ id, delta });
      if (event.target != null && event.target instanceof HTMLElement) {
        const htmlElement: HTMLElement = event.target;
        this.dragEventTargets = [
          ...this.dragEventTargets,
          { htmlElement, prevCursor: htmlElement.style.cursor },
        ];
        htmlElement.style.cursor = resizeCursorStyle;
      }
    });

    this.upSubscription = up$.subscribe(() => {
      if (this.state.isResizing) {
        this.dragEventTargets.reverse().forEach(eventTarget => {
          eventTarget.htmlElement.style.cursor = eventTarget.prevCursor;
        });
        this.dragEventTargets = [];
        this.setState({ isResizing: false });
      }
    });
  }

  public componentWillUnmount() {
    if (this.dragSubscription != null) {
      this.dragSubscription.unsubscribe();
    }

    if (this.upSubscription != null) {
      this.upSubscription.unsubscribe();
    }
  }

  public render() {
    const { bottom, handle, height, left, position, render, right, top } = this.props;

    return (
      <>
        {render(this.state.isResizing)}
        <ResizeHandleContainer
          bottom={bottom}
          data-test-subj="resize-handle-container"
          height={height}
          innerRef={this.ref}
          left={left}
          position={position}
          right={right}
          top={top}
        >
          {handle}
        </ResizeHandleContainer>
      </>
    );
  }

  private calculateDelta = (e: MouseEvent) => {
    const deltaX = calculateDeltaX({ prevX: this.prevX, screenX: e.screenX });

    this.prevX = e.screenX;

    return deltaX;
  };
}
