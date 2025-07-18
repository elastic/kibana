/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
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
  EuiFlexGroup,
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
}

export const GridColumn = ({
  list,
  showMissingIntegrationMessage = false,
  showCardLabels = false,
  isLoading,
  scrollElementId,
  emptyStateStyles,
}: GridColumnProps) => {
  const windowScrollerRef = useRef<WindowScroller>(null);
  const listRef = useRef<VirtualizedList>(null);
  const rowMeasurementCache = useRef<CellMeasurerCache>(
    new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: 150,
    })
  );

  if (isLoading) {
    return (
      <EuiFlexGrid gutterSize="l" columns={3}>
        {Array.from({ length: 12 }).map((_, index) => (
          <EuiFlexItem key={index} grow={3}>
            <EuiSkeletonRectangle height="160px" width="100%" />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    );
  }

  if (!list.length) {
    return (
      <EuiFlexGrid gutterSize="l" columns={3} data-test-subj="emptyState" style={emptyStateStyles}>
        <EuiFlexItem grow={3}>
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
    const items = list.slice(index * 3, index * 3 + 3);
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
            <EuiFlexGroup gutterSize="m">
              {items.map((item) => (
                <EuiFlexItem
                  key={item.id}
                  // Ensure that cards wrapped in EuiTours/EuiPopovers correctly inherit the full grid row height
                  css={css`
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
            </EuiFlexGroup>
            <EuiSpacer size="m" />
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
        undefined
      }
    >
      {({ height, isScrolling, onChildScroll, scrollTop }) => (
        // `key` is a hack to re-render the list when the number of items changes, see:
        // https://stackoverflow.com/questions/52769760/react-virtualized-list-item-does-not-re-render-with-changed-props-until-i-scroll
        <EuiAutoSizer disableHeight key={list.length}>
          {({ width }) => (
            <VirtualizedList
              tabIndex={-1}
              ref={listRef}
              autoHeight
              height={height}
              isScrolling={isScrolling}
              onScroll={onChildScroll}
              overscanRowCount={2}
              rowCount={list.length / 3}
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
