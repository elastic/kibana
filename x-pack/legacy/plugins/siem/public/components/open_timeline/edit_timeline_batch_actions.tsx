/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenuPanel, EuiContextMenuItem, EuiBasicTable } from '@elastic/eui';
import React, { useCallback, Dispatch } from 'react';
import { TimelineDownloader } from './export_timeline/export_timeline';
import { DeleteTimelineModalButton } from './delete_timeline_modal';
import * as i18n from './translations';
import { DeleteTimeline, DeleteTimelines, OpenTimelineResult } from './types';
import { ExportTimeline } from './export_timeline';
import { useEditTimelineActions } from './edit_timeline_actions';
import { ActionToaster } from '../toasters';

export const useEditTimelinBatcheActions = ({
  deleteTimelines,
  dispatchToaster,
  selectedItems,
  tableRef,
}: {
  deleteTimelines: DeleteTimelines | undefined;
  dispatchToaster: Dispatch<ActionToaster>;
  selectedItems: OpenTimelineResult[] | undefined;
  tableRef: React.MutableRefObject<EuiBasicTable<OpenTimelineResult> | undefined>;
}) => {
  const {
    enableExportTimelineDownloader,
    disableExportTimelineDownloader,
    exportedIds,
    getExportedData,
    isEnableDownloader,
    isDeleteTimelineModalOpen,
    onOpenDeleteTimelineModal,
    onCloseDeleteTimelineModal,
  }: DeleteTimeline & ExportTimeline = useEditTimelineActions(selectedItems);
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
                selectedItems?.length !== 1
                  ? i18n.SELECTED_TIMELINES(selectedItems?.length ?? 0)
                  : `"${selectedItems[0]?.title}"`
              }
            />
          )}
          <EuiContextMenuPanel
            items={[
              <EuiContextMenuItem
                disabled={selectedItems == null || selectedItems.length === 0}
                icon="exportAction"
                key="ExportItemKey"
                onClick={() => {
                  enableExportTimelineDownloader();
                }}
              >
                {i18n.EXPORT_SELECTED}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                disabled={selectedItems == null || selectedItems.length === 0}
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
      deleteTimelines,
      dispatchToaster,
      disableExportTimelineDownloader,
      exportedIds,
      getExportedData,
      isEnableDownloader,
      isDeleteTimelineModalOpen,
      selectedItems,
      onCloseDeleteTimelineModal,
      onCompleteBatchActions,
      enableExportTimelineDownloader,
      onOpenDeleteTimelineModal,
    ]
  );
  return { onCompleteBatchActions, getBatchItemsPopoverContent };
};
