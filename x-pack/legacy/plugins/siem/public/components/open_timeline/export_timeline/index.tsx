/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { keys } from 'lodash/fp';
import { OpenTimelineResult } from '../types';
import { KibanaServices } from '../../../lib/kibana';
import { ExportSelectedData } from '../../generic_downloader';
import { TIMELINE_EXPORT_URL } from '../../../../common/constants';

export interface ExportTimeline {
  isEnableDownloader: boolean;
  setIsEnableDownloader: Dispatch<SetStateAction<boolean>>;
  exportedIds:
    | Array<{
        timelineId: string | null | undefined;
        pinnedEventIds: string[] | null | undefined;
        noteIds: string[] | undefined;
      }>
    | undefined;
  getExportedData: ExportSelectedData;
}

export const useExportTimeline = (
  selectedItems?: OpenTimelineResult | OpenTimelineResult[]
): ExportTimeline => {
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
      return array.map(item => ({
        timelineId: item.savedObjectId,
        pinnedEventIds:
          item.pinnedEventIds != null ? keys(item.pinnedEventIds) : item.pinnedEventIds,
        noteIds: item?.notes?.reduce(
          (acc, note) => (note.noteId != null ? [...acc, note.noteId] : acc),
          [] as string[]
        ),
      }));
    },
    [selectedItems]
  );

  return {
    isEnableDownloader,
    setIsEnableDownloader,
    exportedIds: selectedItems != null ? getExportedIds(selectedItems) : undefined,
    getExportedData: exportSelectedTimeline,
  };
};
