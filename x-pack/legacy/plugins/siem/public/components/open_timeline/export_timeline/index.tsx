/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { OpenTimelineResult, DeleteTimelines } from '../types';
import { ExportSelectedData } from '../../generic_downloader';

import { TimelineDownloader } from './export_timeline';
import { DeleteTimelineModalOverlay } from '../delete_timeline_modal';
import { exportSelectedTimeline } from '../../../containers/timeline/all/api';

export interface ExportTimeline {
  disableExportTimelineDownloader: () => void;
  enableExportTimelineDownloader: () => void;
  exportedIds: string[] | undefined;
  isEnableDownloader: boolean;
  setIsEnableDownloader: Dispatch<SetStateAction<boolean>>;
}

export const useExportTimeline = ({
  selectedItems,
  setActionTimeline,
}: {
  selectedItems?: OpenTimelineResult | OpenTimelineResult[];
  setActionTimeline: Dispatch<SetStateAction<undefined | OpenTimelineResult>>;
}): ExportTimeline => {
  const [isEnableDownloader, setIsEnableDownloader] = useState(false);

  const getExportedIds = useCallback(
    (selectedTimelines: OpenTimelineResult | OpenTimelineResult[]) => {
      const array = Array.isArray(selectedTimelines) ? selectedTimelines : [selectedTimelines];
      return array.reduce(
        (acc, item) => (item.savedObjectId ? [...acc, item.savedObjectId] : [...acc]),
        [] as string[]
      );
    },
    [selectedItems]
  );

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

  return {
    disableExportTimelineDownloader,
    enableExportTimelineDownloader,
    exportedIds: selectedItems != null ? getExportedIds(selectedItems) : undefined,
    isEnableDownloader,
    setIsEnableDownloader,
  };
};

const EditTimelineActionsComponent: React.FC<{
  actionItem: OpenTimelineResult | undefined;
  deleteTimelines: DeleteTimelines | undefined;
  exportedIds: string[] | undefined;
  getExportedData: ExportSelectedData;
  isEnableDownloader: boolean;
  isDeleteTimelineModalOpen: boolean;
  onComplete: () => void;
}> = ({
  actionItem,
  deleteTimelines,
  exportedIds,
  getExportedData,
  isEnableDownloader,
  isDeleteTimelineModalOpen,
  onComplete,
}) =>
  actionItem ? (
    <>
      <TimelineDownloader
        exportedIds={exportedIds}
        getExportedData={exportSelectedTimeline}
        isEnableDownloader={isEnableDownloader}
        onComplete={onComplete}
      />
      {deleteTimelines != null && actionItem.savedObjectId && (
        <DeleteTimelineModalOverlay
          deleteTimelines={deleteTimelines}
          isModalOpen={isDeleteTimelineModalOpen}
          onComplete={onComplete}
          savedObjectIds={[actionItem.savedObjectId]}
          title={`"${actionItem?.title}"`}
        />
      )}
    </>
  ) : null;

export const EditTimelineActions = React.memo(EditTimelineActionsComponent);
