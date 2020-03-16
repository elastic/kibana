/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uuid from 'uuid';
import { GenericDownloader, ExportSelectedData } from '../../generic_downloader';
import * as i18n from '../translations';
import { useStateToaster } from '../../toasters';

const ExportTimeline: React.FC<{
  exportedIds: string[] | undefined;
  getExportedData: ExportSelectedData;
  isEnableDownloader: boolean;
  onComplete?: () => void;
}> = ({ onComplete, isEnableDownloader, exportedIds, getExportedData }) => {
  const [, dispatchToaster] = useStateToaster();
  return (
    <>
      {exportedIds != null && isEnableDownloader && (
        <GenericDownloader
          data-test-subj="export-timeline-downloader"
          exportSelectedData={getExportedData}
          filename={`${i18n.EXPORT_FILENAME}.ndjson`}
          ids={exportedIds}
          onExportSuccess={exportCount => {
            if (onComplete != null) onComplete();
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
          onExportFailure={() => {
            if (onComplete != null) onComplete();
          }}
        />
      )}
    </>
  );
};
ExportTimeline.displayName = 'ExportTimeline';
export const TimelineDownloader = React.memo(ExportTimeline);
