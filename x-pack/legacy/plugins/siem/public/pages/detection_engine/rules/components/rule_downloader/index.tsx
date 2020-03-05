/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { isFunction } from 'lodash/fp';
import { exportRules } from '../../../../../containers/detection_engine/rules';
import { displayErrorToast, useStateToaster } from '../../../../../components/toasters';
import * as i18n from './translations';

const InvisibleAnchor = styled.a`
  display: none;
`;

export interface RuleDownloaderProps {
  filename: string;
  ruleIds?: string[];
  onExportComplete: (exportCount: number) => void;
}

/**
 * Component for downloading Rules as an exported .ndjson file. Download will occur on each update to `rules` param
 *
 * @param filename of file to be downloaded
 * @param payload Rule[]
 *
 */
export const RuleDownloaderComponent = ({
  filename,
  ruleIds,
  onExportComplete,
}: RuleDownloaderProps) => {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function exportData() {
      if (anchorRef && anchorRef.current && ruleIds != null && ruleIds.length > 0) {
        try {
          const exportResponse = await exportRules({
            ruleIds,
            signal: abortCtrl.signal,
          });

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

            onExportComplete(ruleIds.length);
          }
        } catch (error) {
          if (isSubscribed) {
            displayErrorToast(i18n.EXPORT_FAILURE, [error.message], dispatchToaster);
          }
        }
      }
    }

    exportData();

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [ruleIds]);

  return <InvisibleAnchor ref={anchorRef} />;
};

RuleDownloaderComponent.displayName = 'RuleDownloaderComponent';

export const RuleDownloader = React.memo(RuleDownloaderComponent);

RuleDownloader.displayName = 'RuleDownloader';
