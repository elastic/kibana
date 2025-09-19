/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SaveScreenshotOptions, ScreenshotUploadSuccess } from '../types';
import { FILE_KIND_DELIMITER } from '../types';
import { getFileName } from './utils';

export const saveScreenshot = async (
  url: string,
  blob: Blob,
  options: SaveScreenshotOptions
): Promise<ScreenshotUploadSuccess | undefined> => {
  const { caseId, owner, appName, pageName, dependencies } = options;

  const filesClient = dependencies?.filesClient;
  if (!filesClient) return;

  const createResult = await filesClient.create({
    name: getFileName(url, appName, pageName),
    kind: `${owner}${FILE_KIND_DELIMITER}`,
    mimeType: 'image/png',
    meta: {
      caseIds: [caseId],
      owner,
    },
  });

  if (createResult) {
    try {
      const fileId = createResult.file.id;
      const uploadResult = await filesClient.upload({
        id: fileId,
        kind: createResult.file.fileKind,
        body: blob,
        contentType: 'image/png',
      });
      return {
        ...uploadResult,
        fileId,
      };
    } catch (err) {
      await filesClient.bulkDelete({
        ids: [createResult.file.id],
      });
    }
  }
};
