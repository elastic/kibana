/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import React, { useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { OPEN_TIMELINE_CLASS_NAME } from './helpers';
import { OpenTimelineProps } from './types';
import { SearchRow } from './search_row';
import { TimelinesTable } from './timelines_table';
import { TitleRow } from './title_row';
import {
  UtilityBar,
  UtilityBarSection,
  UtilityBarGroup,
  UtilityBarText,
  UtilityBarAction,
} from '../detection_engine/utility_bar';
import * as i18n from './translations';
import { BATCH_ACTIONS, REFRESH } from '../../pages/detection_engine/rules/translations';
import { useStateToaster } from '../toasters';

export const OpenTimeline = React.memo<OpenTimelineProps>(
  ({
    deleteTimelines,
    defaultPageSize,
    isLoading,
    itemIdToExpandedNotesRowMap,
    onAddTimelinesToFavorites,
    onDeleteSelected,
    onlyFavorites,
    onOpenTimeline,
    onQueryChange,
    onSelectionChange,
    onTableChange,
    onToggleOnlyFavorites,
    onToggleShowNotes,
    pageIndex,
    pageSize,
    query,
    searchResults,
    selectedItems,
    sortDirection,
    sortField,
    title,
    totalSearchResultsCount,
  }) => {
    const [, dispatchToaster] = useStateToaster();
    const text = useMemo(
      () => (
        <FormattedMessage
          data-test-subj="query-message"
          id="xpack.siem.open.timeline.showingNTimelinesLabel"
          defaultMessage="Showing: {totalSearchResultsCount} {totalSearchResultsCount, plural, one {timeline} other {timelines}} {with}"
          values={{
            totalSearchResultsCount,
            with: (
              <span data-test-subj="selectable-query-text">
                {query.trim().length ? `${i18n.WITH} "${query.trim()}"` : ''}
              </span>
            ),
          }}
        />
      ),
      [totalSearchResultsCount]
    );

    const getBatchItemsPopoverContent = useCallback(
      (closePopover: () => void) => (
        <EuiContextMenuPanel
          items={
            /* getBatchItems(selectedItems, dispatch, dispatchToaster, history, closePopover)*/
            [
              <EuiContextMenuItem
                key={'BatchItemKey'}
                icon="checkInCircleFilled"
                disabled={false}
                onClick={async () => {
                  closePopover();
                }}
              >
                {'Batch Item'}
              </EuiContextMenuItem>,
            ]
          }
        />
      ),
      [selectedItems, /* dispatch, */ dispatchToaster, history]
    );

    return (
      <EuiPanel className={OPEN_TIMELINE_CLASS_NAME}>
        <TitleRow
          data-test-subj="title-row"
          onDeleteSelected={onDeleteSelected}
          onAddTimelinesToFavorites={onAddTimelinesToFavorites}
          selectedTimelinesCount={selectedItems.length}
          title={title}
        >
          <SearchRow
            data-test-subj="search-row"
            onlyFavorites={onlyFavorites}
            onQueryChange={onQueryChange}
            onToggleOnlyFavorites={onToggleOnlyFavorites}
            query={query}
            totalSearchResultsCount={totalSearchResultsCount}
          />
        </TitleRow>

        <UtilityBar border>
          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarText>{text}</UtilityBarText>
            </UtilityBarGroup>

            <UtilityBarGroup>
              <UtilityBarText>{i18n.SELECTED_TIMELINES(selectedItems.length)}</UtilityBarText>
              <UtilityBarAction
                iconSide="right"
                iconType="arrowDown"
                popoverContent={getBatchItemsPopoverContent}
              >
                {BATCH_ACTIONS}
              </UtilityBarAction>
              <UtilityBarAction
                iconSide="right"
                iconType="refresh"
                onClick={() => null /* dispatch({ type: 'refresh' })*/}
              >
                {REFRESH}
              </UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>
        </UtilityBar>

        <TimelinesTable
          actionTimelineToShow={
            onDeleteSelected != null && deleteTimelines != null
              ? ['delete', 'duplicate', 'selectable']
              : ['duplicate', 'selectable']
          }
          data-test-subj="timelines-table"
          deleteTimelines={deleteTimelines}
          defaultPageSize={defaultPageSize}
          loading={isLoading}
          itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
          onOpenTimeline={onOpenTimeline}
          onSelectionChange={onSelectionChange}
          onTableChange={onTableChange}
          onToggleShowNotes={onToggleShowNotes}
          pageIndex={pageIndex}
          pageSize={pageSize}
          searchResults={searchResults}
          showExtendedColumns={true}
          sortDirection={sortDirection}
          sortField={sortField}
          totalSearchResultsCount={totalSearchResultsCount}
        />
      </EuiPanel>
    );
  }
);

OpenTimeline.displayName = 'OpenTimeline';
