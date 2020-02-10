/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import debounce from 'lodash/fp/debounce';
import { VariableSizeList, ListChildComponentProps } from 'react-window';
import { useMeasure } from 'react-use';
import { LogTextStreamLoadingItemView } from './loading_item_view';
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
  const maxDisplayedItems = Math.ceil(height / DEFAULT_ITEM_HEIGHT);

  const windowRef = useRef<VariableSizeList>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const [childHeightsLookup, recordChildHeight] = useImmutableChildHeightLookup();

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
      windowRef.current?.scrollToItem(targetChild, 'end');
    }
  }, [isScrollLocked, windowRef.current, targetChild]);
  useEffect(() => scrollToTargetEffect, [targetChild]);

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

  const resizeItemsEffect = useCallback(() => {
    windowRef.current?.resetAfterIndex(0, true);
  }, [windowRef.current]);
  useEffect(resizeItemsEffect, [windowRef.current, childHeightsLookup]);

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
    windowRef.current?.scrollTo(childHeights.boundingBoxes.totalHeight);
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
    debounce(
      500,
      ({
        visibleStartIndex,
        visibleStopIndex,
      }: {
        visibleStartIndex: number;
        visibleStopIndex: number;
      }) => {
        const visibleChildren = getVisibleChildren({
          visibleStartIndex,
          visibleStopIndex,
          childrenIDStringLookup,
        });
        onVisibleChildrenChange(visibleChildren);
      }
    ),
    [childrenIDStringLookup]
  );

  return (
    <>
      <ScrollPanelWrapper
        data-test-subj={dataTestSubj}
        height={height}
        width={width}
        ref={windowRef}
        innerRef={innerRef}
        itemCount={childrenArray.length}
        itemSize={index =>
          childHeightsLookup.get(childrenIDStringLookup[index]) || DEFAULT_ITEM_HEIGHT
        }
        itemData={{ childrenArray, recordChildHeight, childrenIDStringLookup }}
        onItemsRendered={onItemsRendered}
        estimatedItemSize={DEFAULT_ITEM_HEIGHT}
        overscanCount={isStreaming && !isScrollLocked ? 9999 : OVERSCAN_COUNT}
        fixStreamToBottom={isStreaming && !isScrollLocked}
      >
        {ListItem}
      </ScrollPanelWrapper>
      {isStreaming && isScrollLocked && (
        <LogTextStreamJumpToTail width={width} onClickJump={() => jumpToTail()} />
      )}
    </>
  );
};

const ListItem: React.FC<ListChildComponentProps> = ({ index, style, data }) => {
  const { childrenArray, recordChildHeight, childrenIDStringLookup } = data;
  const [ref, { height }] = useMeasure();
  const idString = childrenIDStringLookup[index];
  useEffect(() => recordChildHeight(idString, height), [height, idString, recordChildHeight]);
  return (
    <div style={style}>
      <div style={{ visibility: height > 0 ? 'visible' : 'hidden' }} ref={ref}>
        {childrenArray[index]}
      </div>
    </div>
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

const useImmutableChildHeightLookup: () => [
  Map<string, number>,
  (id: string, height: number) => void
] = () => {
  const [mutableLookup] = useState(new Map<string, number>());
  const getNewProxy = () =>
    new Proxy(mutableLookup, {
      get(target, prop) {
        if (prop === 'get') return (id: string) => target.get(id);
        if (prop === '_target') return target;
      },
    });
  const [currentProxy, setCurrentProxy] = useState(getNewProxy());

  const refreshProxy = useCallback(
    debounce(100, () => {
      setCurrentProxy(getNewProxy());
    }),
    [setCurrentProxy, getNewProxy]
  );

  return [
    currentProxy as Map<string, number>,
    (id: string, height: number) => {
      if (!mutableLookup.has(id) || mutableLookup.get(id) !== height) {
        mutableLookup.set(id, height);
        refreshProxy();
      }
    },
  ];
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
