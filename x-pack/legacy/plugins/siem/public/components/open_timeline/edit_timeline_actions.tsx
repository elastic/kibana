/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback } from 'react';
import { useExportTimeline, ExportTimeline } from './export_timeline/.';
import { OpenTimelineResult, DeleteTimeline } from './types';
import { useDeleteTimeline } from './delete_timeline_modal/delete_timeline_modal';

export const useEditTimelineActions = (selectedItems?: OpenTimelineResult[] | undefined) => {
  const [actionItem, setActionTimeline] = useState<undefined | OpenTimelineResult>(undefined);

  const deleteTimeline: DeleteTimeline = useDeleteTimeline({
    setActionTimeline,
  });
  const exportTimeline: ExportTimeline = useExportTimeline({
    selectedItems: actionItem != null ? [actionItem] : selectedItems,
    setActionTimeline,
  });

  const onCompleteEditTimelineAction = useCallback(() => {
    deleteTimeline.onCloseDeleteTimelineModal();
    exportTimeline.disableExportTimelineDownloader();
  }, [deleteTimeline.onCloseDeleteTimelineModal, exportTimeline.disableExportTimelineDownloader]);

  return {
    actionItem,
    onCompleteEditTimelineAction,
    setActionTimeline,
    ...deleteTimeline,
    ...exportTimeline,
  };
};
