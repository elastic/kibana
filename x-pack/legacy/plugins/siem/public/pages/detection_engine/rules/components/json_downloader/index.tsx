/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const InvisibleAnchor = styled.a`
  display: none;
`;

export interface JSONDownloaderProps {
  filename: string;
  payload?: object[];
  onExportComplete: (exportCount: number) => void;
}

/**
 * Component for downloading JSON as a file. Download will occur on each update to `payload` param
 *
 * @param filename name of file to be downloaded
 * @param payload JSON string to write to file
 *
 */
export const JSONDownloaderComponent = ({
  filename,
  payload,
  onExportComplete,
}: JSONDownloaderProps) => {
  const anchorRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (anchorRef && anchorRef.current && payload != null) {
      const blob = new Blob([jsonToNDJSON(payload)], { type: 'application/json' });
      // @ts-ignore function is not always defined -- this is for supporting IE
      if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob);
      } else {
        const objectURL = window.URL.createObjectURL(blob);
        anchorRef.current.href = objectURL;
        anchorRef.current.download = filename;
        anchorRef.current.click();
        window.URL.revokeObjectURL(objectURL);
      }
      onExportComplete(payload.length);
    }
  }, [payload]);

  return <InvisibleAnchor ref={anchorRef} />;
};

JSONDownloaderComponent.displayName = 'JSONDownloaderComponent';

export const JSONDownloader = React.memo(JSONDownloaderComponent);

JSONDownloader.displayName = 'JSONDownloader';

export const jsonToNDJSON = (jsonArray: object[], sortKeys = true): string => {
  return jsonArray
    .map(j => JSON.stringify(j, sortKeys ? Object.keys(j).sort() : null, 0))
    .join('\n');
};

export const ndjsonToJSON = (ndjson: string): object[] => {
  const jsonLines = ndjson.split(/\r?\n/);
  return jsonLines.reduce<object[]>((acc, line) => {
    try {
      return [...acc, JSON.parse(line)];
    } catch (e) {
      return acc;
    }
  }, []);
};
