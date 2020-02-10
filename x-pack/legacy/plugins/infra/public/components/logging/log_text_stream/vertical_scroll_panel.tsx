/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import debounce from 'lodash/fp/debounce';
import { VariableSizeList, ListChildComponentProps } from 'react-window';
import { List, CellMeasurer, CellMeasurerCache, ListRowRenderer } from 'react-virtualized';
import { useMeasure } from 'react-use';
import { LogTextStreamJumpToTail } from './jump_to_tail';
import React, { useCallback, useRef, useEffect, useMemo, useState, useLayoutEffect } from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';

const DEFAULT_ITEM_HEIGHT = 25;
const OVERSCAN_COUNT = 20;
const ITEM_PADDING = 4;
const STREAM_ITEM_HEIGHT = 40;

interface VerticalScrollPanelProps {
  onVisibleChildrenChange?: (visibleChildren: {
    topChild: string;
    bottomChild: string;
    entriesBeforeStart: number;
    entriesAfterEnd: number;
  }) => void;
  onScrollLockChange: (isLocked: boolean) => void;
  target: string | null;
  height: number;
  width: number;
  'data-test-subj'?: string;
  isStreaming: boolean;
  entriesCount: number;
}

const SCROLL_DEBOUNCE_INTERVAL = 32;

export const VerticalScrollPanel: React.FC<VerticalScrollPanelProps> = ({
  children,
  target,
  height,
  width,
  'data-test-subj': dataTestSubj,
  onVisibleChildrenChange,
  onScrollLockChange,
  isStreaming,
}) => {
  const [cache] = useState(
    new CellMeasurerCache({
      defaultWidth: 700,
      minWidth: 100,
      fixedWidth: true,
    })
  );

  const maxDisplayedItems = Math.ceil(height / DEFAULT_ITEM_HEIGHT);

  const windowRef = useRef<List>(null);

  const [isScrollLocked, setIsScrollLocked] = useState(false);
  useEffect(() => onScrollLockChange(isScrollLocked), [isScrollLocked]);
  useEffect(() => setIsScrollLocked(false), [isStreaming]);
  // Prevent FOUC before initial column width is rendered
  const [hasInitializedColumnWidth, setHasInitializedColumnWidth] = useState(false);

  const childrenArray = useMemo(() => {
    const arr = React.Children.toArray(children) as React.ReactElement[];
    if (isStreaming && !isScrollLocked) return arr.slice(-maxDisplayedItems);
    return arr;
  }, [children, isStreaming, isScrollLocked]);

  const targetChild = useMemo(
    () =>
      childrenArray.findIndex(child => {
        if (child?.type === React.Fragment) {
          const fragmentChildren = React.Children.toArray(child.props.children);
          const logEntry = fragmentChildren[fragmentChildren.length - 1];
          return logEntry.props.streamItemId === target;
        }
        return false;
      }),
    [childrenArray, target]
  );

  const scrollToTargetEffect = useCallback(() => {
    if (!isScrollLocked) {
      console.log('scrollToTarget', targetChild);
      windowRef.current?.scrollToRow(targetChild, 'end');
    }
  }, [isScrollLocked, windowRef.current, targetChild]);
  useEffect(() => scrollToTargetEffect, [target]);

  const childrenIDStringLookup = useMemo(
    () =>
      childrenArray.map((child, i) => {
        const defaultIdString = `**listItem:${i}`;
        if (child?.type === React.Fragment) {
          const fragmentChildren = React.Children.toArray(child.props.children);
          const logEntry = fragmentChildren[fragmentChildren.length - 1];
          return logEntry.props.streamItemId || defaultIdString;
        }
        return defaultIdString;
      }),
    [childrenArray]
  );

  // Recompute item sizes when new entries are loaded at the beginning or if the page window resizes
  const resizeItemsEffect = useCallback(() => {
    cache.clearAll();
    requestAnimationFrame(scrollToTargetEffect);
  }, [cache]);
  useEffect(resizeItemsEffect, [childrenIDStringLookup[1]]);
  useEffect(debounce(100, resizeItemsEffect), [width]);

  // const handleScrollWhileStreaming = useCallback()

  // const scrollEffect = useCallback(
  //   debounce(SCROLL_DEBOUNCE_INTERVAL, () => {
  //     if (
  //       hasInitializedColumnWidth &&
  //       !isNaN(visibleChildren.pagesAbove) &&
  //       visibleChildren.pagesBelow < Infinity
  //     ) {
  //       onVisibleChildrenChange(visibleChildren);
  //     }
  //   }),
  //   [hasInitializedColumnWidth, visibleChildren, onVisibleChildrenChange]
  // );
  // useEffect(scrollEffect, [visibleChildren]);

  const jumpToTail = useCallback(() => {
    windowRef.current?.scrollToPosition(childHeights.boundingBoxes.totalHeight);
    setIsScrollLocked(false);
  }, [childrenArray, windowRef.current]);

  // const streamUpdateEffect = useCallback(() => {
  //   if (isStreaming && !isScrollLocked) {
  //     setScrollTop(childHeights.boundingBoxes.totalHeight);
  //   }
  // }, [isStreaming, isScrollLocked]);
  // useEffect(() => streamUpdateEffect, [
  //   isStreaming,
  //   isScrollLocked,
  //   childHeights.boundingBoxes.totalHeight,
  // ]);

  const onItemsRendered = useCallback(
    debounce(100, ({ startIndex, stopIndex }: { startIndex: number; stopIndex: number }) => {
      const visibleChildren = getVisibleChildren({
        visibleStartIndex: startIndex,
        visibleStopIndex: stopIndex,
        childrenIDStringLookup,
      });
      onVisibleChildrenChange(visibleChildren);
    }),
    [childrenIDStringLookup]
  );

  const rowRenderer: ListRowRenderer = props => {
    const { key, index, parent, style } = props;
    return (
      <CellMeasurer cache={cache} rowIndex={index} key={key} parent={parent} columnIndex={0}>
        <div style={{ ...style, width }}>{childrenArray[index]}</div>
      </CellMeasurer>
    );
  };
  return (
    <>
      <ScrollPanelWrapper
        data-test-subj={dataTestSubj}
        height={height}
        width={width}
        ref={windowRef}
        rowCount={childrenArray.length}
        onRowsRendered={onItemsRendered}
        overscanRowCount={OVERSCAN_COUNT}
        fixStreamToBottom={isStreaming && !isScrollLocked}
        rowRenderer={rowRenderer}
        estimatedRowSize={DEFAULT_ITEM_HEIGHT * 4}
        rowHeight={cache.rowHeight}
        deferredMeasurementCache={cache}
      />
      {isStreaming && isScrollLocked && (
        <LogTextStreamJumpToTail width={width} onClickJump={() => jumpToTail()} />
      )}
    </>
  );
};

const validateIDStringBelongsToLogEntry = (id?: string) =>
  id && !id.startsWith('**') ? id : false;

const getVisibleChildren = ({
  visibleStartIndex,
  visibleStopIndex,
  childrenIDStringLookup,
}: {
  visibleStartIndex: number;
  visibleStopIndex: number;
  childrenIDStringLookup: Array<string | undefined>;
}) => ({
  topChild:
    validateIDStringBelongsToLogEntry(childrenIDStringLookup[visibleStartIndex]) ||
    childrenIDStringLookup.find(validateIDStringBelongsToLogEntry),
  bottomChild:
    validateIDStringBelongsToLogEntry(childrenIDStringLookup[visibleStopIndex]) ||
    [...childrenIDStringLookup].reverse().find(validateIDStringBelongsToLogEntry),
  entriesBeforeStart: visibleStartIndex,
  entriesAfterEnd: childrenIDStringLookup.length - visibleStopIndex,
});

interface ScrollPanelWrapperProps {
  isHidden: boolean;
  fixStreamToBottom: boolean;
}

const ScrollPanelWrapper = euiStyled(List)<ScrollPanelWrapperProps>`
  position: relative;
  visibility: ${props => (props.isHidden ? 'hidden' : 'visible')};
  & * {
    overflow-anchor: none;
  }
  ${props =>
    props.fixStreamToBottom
      ? `
     & > div {
      position: absolute;
      bottom: 0;
      width: 100%;
    }
  `
      : ''}
`;
