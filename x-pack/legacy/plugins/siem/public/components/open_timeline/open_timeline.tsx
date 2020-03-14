/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiContextMenuPanel, EuiContextMenuItem, EuiBasicTable } from '@elastic/eui';
import React, { useMemo, useCallback, useRef, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { OPEN_TIMELINE_CLASS_NAME } from './helpers';
import { OpenTimelineProps, OpenTimelineResult } from './types';
import { SearchRow } from './search_row';
import { TimelinesTable } from './timelines_table';
import { TitleRow } from './title_row';

import * as i18n from './translations';
import { useStateToaster } from '../toasters';
import { TimelineDownloader } from './export_timeline/export_timeline';
import { DeleteTimelineModalButton } from './delete_timeline_modal';
import {
  UtilityBarGroup,
  UtilityBarText,
  UtilityBar,
  UtilityBarSection,
  UtilityBarAction,
} from '../utility_bar';
import { useExportTimeline } from './export_timeline';
export interface ExportTimelineIds {
  timelineId: string | null | undefined;
  pinnedEventIds: string[] | null | undefined;
  noteIds: string[] | null | undefined;
}

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
    const tableRef = useRef<EuiBasicTable>();
    const [, dispatchToaster] = useStateToaster();
    const [isDeleteTimelineModalOpen, setIsDeleteTimelineModalOpen] = useState<boolean>(false);
    const [actionItem, setActionTimeline] = useState<undefined | OpenTimelineResult>(undefined);
    const {
      isEnableDownloader,
      setIsEnableDownloader,
      exportedIds,
      getExportedData,
    } = useExportTimeline(actionItem ? [actionItem] : selectedItems);
    const enableExportTimelineDownloader = useCallback(
      (selectedActionItem?: OpenTimelineResult) => {
        setIsEnableDownloader(true);
        setActionTimeline(selectedActionItem);
      },
      [setIsEnableDownloader, setActionTimeline]
    );

    const disableExportTimelineDownloader = useCallback(() => {
      setIsEnableDownloader(false);
    }, [setIsEnableDownloader]);

    const onCloseDeleteTimelineModal = useCallback(() => {
      setIsDeleteTimelineModalOpen(false);
      setActionTimeline(undefined);
    }, [setIsDeleteTimelineModalOpen]);

    const onOpenDeleteTimelineModal = useCallback(
      (selectedActionItem?: OpenTimelineResult) => {
        setIsDeleteTimelineModalOpen(true);
        setActionTimeline(selectedActionItem);
      },
      [setIsDeleteTimelineModalOpen, setActionTimeline]
    );

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
    const onCompleteBatchActions = useCallback(
      (closePopover?: () => void) => {
        if (closePopover != null) closePopover();
        if (tableRef != null && tableRef.current != null) {
          tableRef.current.changeSelection([]);
        }
      },
      [tableRef.current]
    );

    const getBatchItemsPopoverContent = useCallback(
      (closePopover: () => void) => {
        return (
          <>
            <TimelineDownloader
              exportedIds={exportedIds}
              getExportedData={getExportedData}
              isEnableDownloader={isEnableDownloader}
              onDownloadComplete={onCompleteBatchActions.bind(null, closePopover)}
              selectedItems={selectedItems}
              disableExportTimelineDownloader={disableExportTimelineDownloader}
            />
            {deleteTimelines != null && (
              <DeleteTimelineModalButton
                closeModal={onCloseDeleteTimelineModal}
                deleteTimelines={deleteTimelines}
                onComplete={onCompleteBatchActions.bind(null, closePopover)}
                isModalOpen={isDeleteTimelineModalOpen}
                savedObjectIds={selectedItems?.reduce(
                  (acc, item) => (item.savedObjectId != null ? [...acc, item.savedObjectId] : acc),
                  [] as string[]
                )}
                title={
                  selectedItems.length > 1
                    ? i18n.SELECTED_TIMELINES(selectedItems.length)
                    : `"${selectedItems[0]?.title}"`
                }
              />
            )}
            <EuiContextMenuPanel
              items={[
                <EuiContextMenuItem
                  disabled={selectedItems.length === 0}
                  icon="exportAction"
                  key="ExportItemKey"
                  onClick={() => {
                    enableExportTimelineDownloader();
                  }}
                >
                  {i18n.EXPORT_SELECTED}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  disabled={selectedItems.length === 0}
                  icon="trash"
                  key="DeleteItemKey"
                  onClick={() => {
                    onOpenDeleteTimelineModal();
                  }}
                >
                  {i18n.DELETE_SELECTED}
                </EuiContextMenuItem>,
              ]}
            />
          </>
        );
      },
      [
        actionItem,
        deleteTimelines,
        dispatchToaster,
        history,
        isEnableDownloader,
        isDeleteTimelineModalOpen,
        selectedItems,
        onCloseDeleteTimelineModal,
        onCompleteBatchActions,
        exportedIds,
        getExportedData,
      ]
    );

    return (
      <>
        <TimelineDownloader
          exportedIds={exportedIds}
          getExportedData={getExportedData}
          isEnableDownloader={isEnableDownloader}
          onDownloadComplete={onCompleteBatchActions}
          selectedItems={[actionItem]}
          disableExportTimelineDownloader={disableExportTimelineDownloader}
        />
        {deleteTimelines != null && (
          <DeleteTimelineModalButton
            closeModal={onCloseDeleteTimelineModal}
            deleteTimelines={deleteTimelines}
            onComplete={onCompleteBatchActions}
            isModalOpen={isDeleteTimelineModalOpen}
            savedObjectIds={[actionItem?.savedObjectId]}
            title={`"${actionItem?.title}"`}
          />
        )}
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
                  onClick={() => {
                    if (typeof refetch === 'function') refetch();
                  }}
                >
                  {i18n.REFRESH}
                </UtilityBarAction>
              </UtilityBarGroup>
            </UtilityBarSection>
          </UtilityBar>

          <TimelinesTable
            actionTimelineToShow={
              onDeleteSelected != null && deleteTimelines != null
                ? ['delete', 'duplicate', 'export', 'selectable']
                : ['duplicate', 'export', 'selectable']
            }
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
