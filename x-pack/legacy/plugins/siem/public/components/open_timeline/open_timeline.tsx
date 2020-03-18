/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiBasicTable } from '@elastic/eui';
import React, { useCallback, useMemo, useRef } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { OPEN_TIMELINE_CLASS_NAME } from './helpers';
import { OpenTimelineProps, OpenTimelineResult } from './types';
import { SearchRow } from './search_row';
import { TimelinesTable } from './timelines_table';
import { TitleRow } from './title_row';

import * as i18n from './translations';
import { EditTimelineActions } from './export_timeline/.';
import {
  UtilityBarGroup,
  UtilityBarText,
  UtilityBar,
  UtilityBarSection,
  UtilityBarAction,
} from '../utility_bar';
import { useEditTimelinBatchActions } from './edit_timeline_batch_actions';
import { useEditTimelineActions } from './edit_timeline_actions';

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
    refetch,
    searchResults,
    selectedItems,
    sortDirection,
    sortField,
    title,
    totalSearchResultsCount,
  }) => {
    const tableRef = useRef<EuiBasicTable<OpenTimelineResult>>();

    const {
      actionItem,
      enableExportTimelineDownloader,
      isEnableDownloader,
      isDeleteTimelineModalOpen,
      onOpenDeleteTimelineModal,
      onCompleteEditTimelineAction,
    } = useEditTimelineActions();

    const { getBatchItemsPopoverContent } = useEditTimelinBatchActions({
      deleteTimelines,
      selectedItems,
      tableRef,
    });

    const nTimelines = useMemo(
      () => (
        <FormattedMessage
          id="xpack.siem.open.timeline.showingNTimelinesLabel"
          defaultMessage="{totalSearchResultsCount} {totalSearchResultsCount, plural, one {timeline} other {timelines}} {with}"
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
      [totalSearchResultsCount, query]
    );

    const actionItemId = useMemo(() => (actionItem != null ? [actionItem.savedObjectId] : []), [
      actionItem,
    ]);

    return (
      <>
        <EditTimelineActions
          deleteTimelines={deleteTimelines}
          ids={actionItemId}
          isDeleteTimelineModalOpen={isDeleteTimelineModalOpen}
          isEnableDownloader={isEnableDownloader}
          onComplete={onCompleteEditTimelineAction}
          title={actionItem != null ? actionItem.title : ''}
        />

        <EuiPanel className={OPEN_TIMELINE_CLASS_NAME}>
          <TitleRow
            data-test-subj="title-row"
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
                <UtilityBarText data-test-subj="query-message">
                  <>
                    {i18n.SHOWING} {nTimelines}
                  </>
                </UtilityBarText>
              </UtilityBarGroup>

              <UtilityBarGroup>
                <UtilityBarText>{i18n.SELECTED_TIMELINES(selectedItems.length)}</UtilityBarText>
                <UtilityBarAction
                  iconSide="right"
                  iconType="arrowDown"
                  popoverContent={getBatchItemsPopoverContent}
                >
                  {i18n.BATCH_ACTIONS}
                </UtilityBarAction>
                <UtilityBarAction
                  iconSide="right"
                  iconType="refresh"
                  onClick={useCallback(() => {
                    if (typeof refetch === 'function') refetch();
                  }, [refetch])}
                >
                  {i18n.REFRESH}
                </UtilityBarAction>
              </UtilityBarGroup>
            </UtilityBarSection>
          </UtilityBar>

          <TimelinesTable
            actionTimelineToShow={useMemo(
              () =>
                onDeleteSelected != null && deleteTimelines != null
                  ? ['delete', 'duplicate', 'export', 'selectable']
                  : ['duplicate', 'export', 'selectable'],
              [onDeleteSelected, deleteTimelines]
            )}
            data-test-subj="timelines-table"
            deleteTimelines={deleteTimelines}
            defaultPageSize={defaultPageSize}
            loading={isLoading}
            itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
            enableExportTimelineDownloader={enableExportTimelineDownloader}
            onOpenDeleteTimelineModal={onOpenDeleteTimelineModal}
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
            tableRef={tableRef}
            totalSearchResultsCount={totalSearchResultsCount}
          />
        </EuiPanel>
      </>
    );
  }
);

OpenTimeline.displayName = 'OpenTimeline';
