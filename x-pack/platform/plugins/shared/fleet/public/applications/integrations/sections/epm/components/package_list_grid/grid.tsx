/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useEffect } from 'react';
import type { ListRowRenderer } from 'react-virtualized';
import { List as VirtualizedList, CellMeasurer, CellMeasurerCache } from 'react-virtualized';
import { css } from '@emotion/react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiAutoSizer,
  EuiSkeletonRectangle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { WindowScroller } from 'react-virtualized';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';

import type { IntegrationCardItem } from '../../screens/home';

import { PackageCard } from '../package_card';

interface GridColumnProps {
  list: IntegrationCardItem[];
  isLoading: boolean;
  showMissingIntegrationMessage?: boolean;
  showCardLabels?: boolean;
  scrollElementId?: string;
  emptyStateStyles?: Record<string, string>;
  columnCount?: 1 | 2 | 3;
  gutterSize?: 's' | 'm';
}

export const GridColumn = ({
  list,
  showMissingIntegrationMessage = false,
  showCardLabels = false,
  isLoading,
  scrollElementId,
  emptyStateStyles,
  columnCount = 3,
  gutterSize = 'm',
}: GridColumnProps) => {
  const windowScrollerRef = useRef<WindowScroller>(null);
  const listRef = useRef<VirtualizedList>(null);
  const rowMeasurementCache = useRef<CellMeasurerCache>(
    new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: 150,
    })
  );

  // Reset the row measurement cache when the list changes
  useEffect(() => {
    if (rowMeasurementCache.current) {
      rowMeasurementCache.current.clearAll();
    }
  }, [list]);

  if (isLoading) {
    return (
      <EuiFlexGrid gutterSize={gutterSize} columns={columnCount} alignItems="start">
        {Array.from({ length: 12 }).map((_, index) => (
          <EuiFlexItem key={index} grow={columnCount}>
            <EuiSkeletonRectangle height="160px" width="100%" />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    );
  }

  if (!list.length) {
    return (
      <EuiFlexGrid
        gutterSize={gutterSize}
        columns={columnCount}
        data-test-subj="emptyState"
        style={emptyStateStyles}
        alignItems="start"
      >
        <EuiFlexItem grow={columnCount}>
          <EuiText>
            <p>
              {showMissingIntegrationMessage ? (
                <FormattedMessage
                  id="xpack.fleet.epmList.missingIntegrationPlaceholder"
                  defaultMessage="We didn't find any integrations matching your search term. Please try another keyword or browse using the categories on the left."
                />
              ) : (
                <FormattedMessage
                  id="xpack.fleet.epmList.noPackagesFoundPlaceholder"
                  defaultMessage="No integrations found"
                />
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGrid>
    );
  }

  const rowRenderer: ListRowRenderer = ({ index, key, parent, style }) => {
    const items = list.slice(index * columnCount, index * columnCount + columnCount);
    return (
      <CellMeasurer
        cache={rowMeasurementCache.current}
        key={key}
        columnIndex={0}
        rowIndex={index}
        parent={parent}
      >
        {({ registerChild }) => (
          <div ref={registerChild} style={style}>
            <EuiFlexGrid columns={columnCount} gutterSize={gutterSize} alignItems="start">
              {items.map((item) => (
                <EuiFlexItem
                  key={item.id}
                  // Ensure that cards wrapped in EuiTours/EuiPopovers correctly inherit the full grid row height
                  css={css`
                    align-self: stretch;
                    min-width: 0;
                    & > .euiPopover,
                    & > .euiPopover > .euiCard {
                      height: 100%;
                    }
                  `}
                  tabIndex={-1}
                >
                  <PackageCard {...item} showLabels={showCardLabels} />
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
            <EuiSpacer size={gutterSize} />
          </div>
        )}
      </CellMeasurer>
    );
  };

  return (
    <WindowScroller
      ref={windowScrollerRef}
      scrollElement={
        (scrollElementId && document.getElementById(scrollElementId)) ||
        document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID) ||
        window
      }
      onResize={() => {
        if (rowMeasurementCache.current) {
          rowMeasurementCache.current.clearAll();
        }
      }}
    >
      {({ height, isScrolling, onChildScroll, scrollTop }) => (
        <EuiAutoSizer disableHeight>
          {({ width }) => (
            <VirtualizedList
              tabIndex={-1}
              ref={listRef}
              autoHeight
              height={height}
              isScrolling={isScrolling}
              onScroll={onChildScroll}
              overscanRowCount={2}
              rowCount={Math.ceil(list.length / columnCount)}
              deferredMeasurementCache={rowMeasurementCache.current}
              rowHeight={rowMeasurementCache.current.rowHeight}
              rowRenderer={rowRenderer}
              scrollTop={scrollTop}
              width={width}
              // Prevent clipping of card shadows on hover
              css={css`
                overflow: visible !important;
                .ReactVirtualized__Grid__innerScrollContainer {
                  overflow: visible !important;
                }
              `}
            />
          )}
        </EuiAutoSizer>
      )}
    </WindowScroller>
  );
};
