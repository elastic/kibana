/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { isFunction, isNil } from 'lodash/fp';
import {
  exportRules,
  ExportDocumentsProps,
} from '../../../../../containers/detection_engine/rules';
import { displayErrorToast, useStateToaster } from '../../../../../components/toasters';
import * as i18n from './translations';

const InvisibleAnchor = styled.a`
  display: none;
`;

export type ExportSelectedData = ({
  excludeExportDetails,
  filename,
  ids,
  signal,
}: ExportDocumentsProps) => Promise<Blob>;

interface ExportTimelineIds {
  timelineId: string;
  noteIds: string[];
  pinnedEventIds: string[];
}

export interface RuleDownloaderProps {
  filename: string;
  ids?: ExportTimelineIds[];
  ruleIds?: string[];
  exportSelectedData?: ExportSelectedData;
  onExportComplete: (exportCount: number) => void;
  onExportFailure?: () => void;
}

/**
 * Component for downloading Rules as an exported .ndjson file. Download will occur on each update to `rules` param
 *
 * @param filename of file to be downloaded
 * @param payload Rule[]
 *
 */
export const RuleDownloaderComponent = ({
  exportSelectedData,
  filename,
  ids,
  ruleIds,
  onExportComplete,
  onExportFailure,
}: RuleDownloaderProps) => {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function exportData() {
      if (
        anchorRef &&
        anchorRef.current &&
        ((ruleIds != null && ruleIds.length > 0) || (ids != null && ids.length > 0))
      ) {
        let exportResponse;
        try {
          if (isNil(exportSelectedData)) {
            exportResponse = await exportRules({
              ruleIds,
              signal: abortCtrl.signal,
            });
          } else {
            exportResponse = await exportSelectedData({
              ids,
              signal: abortCtrl.signal,
            });
          }
          if (isSubscribed) {
            // this is for supporting IE
            if (isFunction(window.navigator.msSaveOrOpenBlob)) {
              window.navigator.msSaveBlob(exportResponse);
            } else {
              const objectURL = window.URL.createObjectURL(exportResponse);
              // These are safe-assignments as writes to anchorRef are isolated to exportData
              anchorRef.current.href = objectURL; // eslint-disable-line require-atomic-updates
              anchorRef.current.download = filename; // eslint-disable-line require-atomic-updates
              anchorRef.current.click();
              window.URL.revokeObjectURL(objectURL);
            }

            if (typeof onExportComplete === 'function') onExportComplete(ids.length);
          }
        } catch (error) {
          if (isSubscribed) {
            displayErrorToast(i18n.EXPORT_FAILURE, [error.message], dispatchToaster);
            if (typeof onExportFailure === 'function') onExportFailure();
          }
        }
      }
    }

    exportData();

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [ids]);

  return <InvisibleAnchor ref={anchorRef} />;
};

RuleDownloaderComponent.displayName = 'RuleDownloaderComponent';

export const RuleDownloader = React.memo(RuleDownloaderComponent);

RuleDownloader.displayName = 'RuleDownloader';
