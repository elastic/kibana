/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { OpenTimelineResult, DeleteTimelines } from '../types';
import { KibanaServices } from '../../../lib/kibana';
import { ExportSelectedData } from '../../generic_downloader';
import { TIMELINE_EXPORT_URL } from '../../../../common/constants';
import { TimelineDownloader } from './export_timeline';
import { DeleteTimelineModalOverlay } from '../delete_timeline_modal';

export interface ExportTimeline {
  disableExportTimelineDownloader: () => void;
  enableExportTimelineDownloader: () => void;
  exportedIds: string[] | undefined;
  getExportedData: ExportSelectedData;
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

      return response.body!;
    },
    [selectedItems]
  );

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
    getExportedData: exportSelectedTimeline,
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
        getExportedData={getExportedData}
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
