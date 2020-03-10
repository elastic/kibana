/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uuid from 'uuid';
import { OpenTimelineResult } from '../types';
import { GenericDownloader } from '../../generic_downloader';
import * as i18n from '../translations';
import { ActionListIcon, TimelineCustomAction } from '../delete_timeline_modal';
import { useExportTimeline } from '.';
import { useStateToaster } from '../../toasters';

const ExportTimeline: React.FC<{
  selectedTimelines: OpenTimelineResult[] | undefined;
  onDownloadComplete?: () => void;
}> = ({ selectedTimelines, onDownloadComplete }) => {
  const { enableDownloader, setEnableDownloader, exportedIds, getExportedData } = useExportTimeline(
    selectedTimelines
  );
  const [, dispatchToaster] = useStateToaster();

  return (
    <>
      {selectedTimelines != null && exportedIds != null && enableDownloader && (
        <GenericDownloader
          filename={`${i18n.EXPORT_FILENAME}.ndjson`}
          ids={exportedIds}
          exportSelectedData={getExportedData}
          onExportComplete={exportCount => {
            setEnableDownloader(false);
            if (typeof onDownloadComplete === 'function') onDownloadComplete();
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
      <TimelineCustomAction
        aria-label={i18n.DELETE_SELECTED}
        color="text"
        disabled={selectedTimelines == null || selectedTimelines.length === 0}
        onClick={() => {
          setEnableDownloader(true);
        }}
      >
        <>
          <ActionListIcon size="m" type="exportAction" />
          {i18n.EXPORT_SELECTED}
        </>
      </TimelineCustomAction>
    </>
  );
};
ExportTimeline.displayName = 'ExportTimeline';

export const TimelineDownloader = React.memo(ExportTimeline);
