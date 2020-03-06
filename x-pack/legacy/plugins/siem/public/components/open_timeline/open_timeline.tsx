/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import React, { useMemo, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import uuid from 'uuid';
import { keys } from 'lodash/fp';
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
import {
  BATCH_ACTIONS,
  BATCH_ACTION_EXPORT_SELECTED,
  REFRESH,
  EXPORT_FILENAME,
} from '../../pages/detection_engine/rules/translations';
import { useStateToaster } from '../toasters';
import {
  RuleDownloader,
  ExportSelectedData,
} from '../../pages/detection_engine/rules/components/rule_downloader';

import { TIMELINE_EXPORT_URL } from '../../../common/constants';
import { throwIfNotOk } from '../../hooks/api/api';
import { KibanaServices } from '../../lib/kibana';

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
    searchResults,
    selectedItems,
    sortDirection,
    sortField,
    title,
    totalSearchResultsCount,
  }) => {
    const [, dispatchToaster] = useStateToaster();
    const [enableDownloader, setEnableDownloader] = useState(false);

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

    const exportSelectedTimeline: ExportSelectedData = useCallback(
      async ({
        excludeExportDetails = false,
        filename = `timelines_export.ndjson`,
        ids = [],
        signal,
      }): Promise<Blob> => {
        const body = ids.length > 0 ? JSON.stringify({ objects: ids }) : undefined;
        const response = await KibanaServices.get().http.fetch<Blob>(`${TIMELINE_EXPORT_URL}`, {
          method: 'POST',
          body,
          query: {
            exclude_export_details: excludeExportDetails,
            file_name: filename,
          },
          signal,
          asResponse: true,
        });

        await throwIfNotOk(response.response);
        return response.body!;
      },
      []
    );

    const getBatchItemsPopoverContent = useCallback(
      (closePopover: () => void) => (
        <EuiContextMenuPanel
          items={[
            <EuiContextMenuItem
              key={'ExportItemKey'}
              icon="exportAction"
              disabled={selectedItems.length === 0}
              onClick={async () => {
                closePopover();

                setEnableDownloader(true);
              }}
            >
              {BATCH_ACTION_EXPORT_SELECTED}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key={'DeleteItemKey'}
              icon="trash"
              disabled={selectedItems.length === 0}
              onClick={async () => {
                closePopover();
                if (typeof onDeleteSelected === 'function') onDeleteSelected();
              }}
            >
              {'Delete selected timeline'}
            </EuiContextMenuItem>,
          ]}
        />
      ),
      [selectedItems, dispatchToaster, history]
    );

    const getSelectedItemsIds: ExportTimelineIds[] = useMemo(() => {
      return selectedItems.map(item => ({
        timelineId: item.savedObjectId,
        pinnedEventIds:
          item.pinnedEventIds != null ? keys(item.pinnedEventIds) : item.pinnedEventIds,
        noteIds: item.noteIds,
      }));
    }, [selectedItems]);

    return (
      <>
        {enableDownloader && (
          <RuleDownloader
            filename={`${EXPORT_FILENAME}.ndjson`}
            ids={getSelectedItemsIds}
            exportSelectedData={exportSelectedTimeline}
            onExportComplete={exportCount => {
              setEnableDownloader(false);
              dispatchToaster({
                type: 'addToaster',
                toast: {
                  id: uuid.v4(),
                  title: i18n.SUCCESSFULLY_EXPORTED_TIMELINES(exportCount),
                  color: 'success',
                  iconType: 'check',
                },
              });
            }}
          />
        )}
        <EuiPanel className={OPEN_TIMELINE_CLASS_NAME}>
          <TitleRow
            data-test-subj="title-row"
            onAddTimelinesToFavorites={onAddTimelinesToFavorites}
            // onDeleteSelected={onDeleteSelected}
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
                <UtilityBarAction iconSide="right" iconType="refresh" onClick={() => null}>
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
      </>
    );
  }
);

OpenTimeline.displayName = 'OpenTimeline';
