/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Children, ReactNode, useRef, useState, useMemo } from 'react';

import { Resizer } from './resizer';
import { useUI } from '../../hooks';
import { Panel } from './panel';

export interface Props {
  children: ReactNode;
  onPanelWidthChange?: (arrayOfPanelWidths: number[]) => any;
}

interface State {
  isDragging: boolean;
  currentResizerPos: number;
}

const initialState: State = { isDragging: false, currentResizerPos: -1 };

const pxToPercent = (proportion: number, whole: number) => (proportion / whole) * 100;

export function Panels({ children, onPanelWidthChange }: Props) {
  const [firstChild, secondChild] = Children.toArray(children);
  const { panels } = useUI();

  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>(initialState);

  const getContainerWidth = () => {
    return containerRef.current!.getBoundingClientRect().width;
  };

  const first = useMemo(() => <Panel key="first">{firstChild}</Panel>, []);
  const second = useMemo(() => <Panel key="second">{secondChild}</Panel>, []);

  const childrenWithResizer = [
    first,
    <Resizer
      key={'resizer'}
      onMouseDown={event => {
        event.preventDefault();
        setState({
          ...state,
          isDragging: true,
          currentResizerPos: event.clientX,
        });
      }}
    />,
    second,
  ];

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', height: '100%', width: '100%' }}
      onMouseMove={event => {
        if (state.isDragging) {
          const { clientX: x } = event;
          const [left, right] = panels;
          const delta = x - state.currentResizerPos;
          const containerWidth = getContainerWidth();
          const leftPercent = pxToPercent(left.getWidth() + delta, containerWidth);
          const rightPercent = pxToPercent(right.getWidth() - delta, containerWidth);
          left.setWidth(leftPercent);
          right.setWidth(rightPercent);

          if (onPanelWidthChange) {
            onPanelWidthChange([leftPercent, rightPercent]);
          }

          setState({ ...state, currentResizerPos: x });
        }
      }}
      onMouseUp={() => {
        setState(initialState);
      }}
    >
      {childrenWithResizer}
    </div>
  );
}
