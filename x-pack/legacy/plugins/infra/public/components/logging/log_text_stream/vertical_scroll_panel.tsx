/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import debounce from 'lodash/fp/debounce';
import { VariableSizeList } from 'react-window';
import { LogTextStreamLoadingItemView } from './loading_item_view';
import { LogTextStreamJumpToTail } from './jump_to_tail';
import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { useLogEntryMessageColumnWidthContext } from './log_entry_message_column';
import { BoundingBoxes1D } from './bounding_boxes_1d';

import euiStyled from '../../../../../../common/eui_styled_components';

const DEFAULT_ITEM_HEIGHT = 25;
const ITEM_PADDING = 4;
const STREAM_ITEM_HEIGHT = 40;

interface VerticalScrollPanelProps {
  onVisibleChildrenChange?: (visibleChildren: {
    topChild: string;
    middleChild: string;
    bottomChild: string;
    pagesAbove: number;
    pagesBelow: number;
    fromScroll: boolean;
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
  const maxDisplayedItems = Math.ceil(height / DEFAULT_ITEM_HEIGHT);

  const windowRef = useRef<VariableSizeList>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const {
    messageColumnWidth,
    characterDimensions,
    getLogEntryHeightFromMessageContent,
    recalculateColumnSize,
  } = useLogEntryMessageColumnWidthContext();
  const [scrollTop, setScrollTop] = useState(0);

  const [isScrollLocked, setIsScrollLocked] = useState(false);
  useEffect(() => onScrollLockChange(isScrollLocked), [isScrollLocked]);
  useEffect(() => setIsScrollLocked(false), [isStreaming]);
  // Prevent FOUC before initial column width is rendered
  const [hasInitializedColumnWidth, setHasInitializedColumnWidth] = useState(false);

  const childrenArray = useMemo(() => {
    const arr = React.Children.toArray(children);
    if (isStreaming && !isScrollLocked) return arr.slice(-maxDisplayedItems);
    return arr;
  }, [children, isStreaming, isScrollLocked]);

  const targetChild = useMemo(
    () =>
      childrenArray.findIndex(child => {
        if (child && 'type' in child && child?.type === React.Fragment) {
          const fragmentChildren = React.Children.toArray(child.props.children);
          const logEntry = fragmentChildren[fragmentChildren.length - 1];
          return logEntry.props.streamItemId === target;
        }
        return false;
      }),
    [childrenArray, target]
  );

  const centerTargetEffect = useCallback(() => {
    if (!isScrollLocked) {
      windowRef.current?.scrollToItem(targetChild, 'smart');
    }
  }, [isScrollLocked, windowRef.current]);
  useEffect(() => centerTargetEffect, [targetChild, hasInitializedColumnWidth]);

  const childHeights = useMemo(() => {
    const boundingBoxes = new BoundingBoxes1D<number>();
    const pxHeights = childrenArray.map(child => {
      if (child && 'type' in child) {
        if (child.type === React.Fragment) {
          const fragmentChildren = React.Children.toArray(child.props.children);
          const hasDateRow = fragmentChildren.length === 2;

          const logEntry = fragmentChildren[fragmentChildren.length - 1];
          const logEntryValue = logEntry.props.logEntry;
          const logEntryId = logEntry.props.streamItemId;
          const logEntryHeight = getLogEntryHeightFromMessageContent(
            logEntryValue,
            messageColumnWidth,
            characterDimensions
          );
          const totalHeight = logEntryHeight
            ? logEntryHeight + ITEM_PADDING + (hasDateRow ? DEFAULT_ITEM_HEIGHT : 0)
            : DEFAULT_ITEM_HEIGHT;
          boundingBoxes.add(logEntryId, totalHeight);
          return totalHeight;
        } else if (child.type === LogTextStreamLoadingItemView) {
          return STREAM_ITEM_HEIGHT;
        }
      }
      return DEFAULT_ITEM_HEIGHT;
    });
    return { pxHeights, boundingBoxes };
  }, [childrenArray, messageColumnWidth, characterDimensions, getLogEntryHeightFromMessageContent]);

  const resizeItemsEffect = useCallback(() => windowRef.current?.resetAfterIndex(0, true), [
    windowRef.current,
  ]);
  useEffect(resizeItemsEffect, [
    windowRef.current,
    messageColumnWidth,
    characterDimensions,
    recalculateColumnSize,
    childHeights,
  ]);

  const visibleChildren = useMemo(
    () => getVisibleChildren({ height, boundingBoxes: childHeights.boundingBoxes, scrollTop }),
    [height, childHeights.boundingBoxes, scrollTop]
  );

  const handleScroll = useCallback(
    debounce(
      SCROLL_DEBOUNCE_INTERVAL,
      ({
        scrollOffset,
        scrollUpdateWasRequested,
      }: {
        scrollOffset: number;
        scrollUpdateWasRequested: boolean;
      }) => {
        setScrollTop(scrollOffset);
        const { pagesBelow } = getVisibleChildren({
          height,
          boundingBoxes: childHeights.boundingBoxes,
          scrollTop: scrollOffset,
        });
        // if (!scrollUpdateWasRequested && isStreaming) {
        //   setIsScrollLocked(pagesBelow > 0);
        // }
      }
    ),
    [
      height,
      childHeights.boundingBoxes,
      characterDimensions,
      isStreaming,
      visibleChildren.pagesBelow,
    ]
  );

  // const handleScrollWhileStreaming = useCallback()

  const scrollEffect = useCallback(
    debounce(SCROLL_DEBOUNCE_INTERVAL, () => {
      if (
        hasInitializedColumnWidth &&
        !isNaN(visibleChildren.pagesAbove) &&
        visibleChildren.pagesBelow < Infinity
      ) {
        onVisibleChildrenChange(visibleChildren);
      }
    }),
    [hasInitializedColumnWidth, visibleChildren, onVisibleChildrenChange]
  );
  useEffect(scrollEffect, [visibleChildren]);

  const jumpToTail = useCallback(() => {
    windowRef.current?.scrollTo(childHeights.boundingBoxes.totalHeight);
    setIsScrollLocked(false);
  }, [childrenArray, windowRef.current, childHeights.boundingBoxes.totalHeight]);

  const streamUpdateEffect = useCallback(() => {
    if (isStreaming && !isScrollLocked) {
      setScrollTop(childHeights.boundingBoxes.totalHeight);
    }
  }, [isStreaming, isScrollLocked]);
  useEffect(() => streamUpdateEffect, [
    isStreaming,
    isScrollLocked,
    childHeights.boundingBoxes.totalHeight,
  ]);

  const onItemsRendered = useCallback(() => {
    if (!hasInitializedColumnWidth) {
      // It will take a few animation frames for the message columns to render at their full width on
      // initial render. Recalculate until the column width returns a value greater than two characters wide
      if (characterDimensions.width > 0 && messageColumnWidth >= characterDimensions.width * 2) {
        setHasInitializedColumnWidth(true);
        return;
      }
      recalculateColumnSize();

      // if (isStreaming && !isScrollLocked) {
      //   windowRef.current?.scrollTo(childHeights.boundingBoxes.totalHeight);
      // }
    }
  }, [hasInitializedColumnWidth, messageColumnWidth, characterDimensions.width]);

  useEffect(() => {
    if (innerRef.current) {
      const { current } = innerRef;
      const handler = e => {
        if (e.deltaY < 0) {
          setIsScrollLocked(true);
          windowRef.current?.scrollToItem(childrenArray[childrenArray.length - 1], 'smart');
        }
      };
      current.addEventListener('wheel', handler);
      return () => current.removeEventListener('wheel', handler);
    }
  }, [innerRef.current]);
  console.log(isScrollLocked, scrollTop);

  return (
    <>
      <ScrollPanelWrapper
        data-test-subj={dataTestSubj}
        height={height}
        width={width}
        onScroll={handleScroll}
        ref={windowRef}
        innerRef={innerRef}
        isHidden={!hasInitializedColumnWidth}
        itemCount={childrenArray.length}
        itemSize={index => childHeights.pxHeights[index]}
        onItemsRendered={onItemsRendered}
        estimatedItemSize={DEFAULT_ITEM_HEIGHT * 4}
        overscanCount={isStreaming && !isScrollLocked ? 9999 : 4}
        fixStreamToBottom={isStreaming && !isScrollLocked}
      >
        {({ index, style }) => <div style={style}>{childrenArray[index]}</div>}
      </ScrollPanelWrapper>
      {isStreaming && isScrollLocked && (
        <LogTextStreamJumpToTail width={width} onClickJump={() => jumpToTail()} />
      )}
    </>
  );
};

const getVisibleChildren = ({
  height,
  scrollTop,
  boundingBoxes,
}: {
  height: number;
  scrollTop: number;
  boundingBoxes: BoundingBoxes1D<number>;
}) => {
  const scrollCenter = Math.floor(height / 2 + scrollTop);
  const scrollBottom = Math.floor(height + scrollTop);
  const topChild = boundingBoxes.find(scrollTop);
  const middleChild = boundingBoxes.find(scrollCenter);
  const bottomChild = boundingBoxes.find(scrollBottom);
  return {
    topChild,
    middleChild,
    bottomChild,
    pagesAbove: scrollTop / height,
    pagesBelow: Math.max(0, (boundingBoxes.totalHeight - scrollTop - height) / height),
  };
};

interface ScrollPanelWrapperProps {
  isHidden: boolean;
  fixStreamToBottom: boolean;
}

const ScrollPanelWrapper = euiStyled(VariableSizeList)<ScrollPanelWrapperProps>`
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
