/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { DoneNotification } from '@kbn/shared-ux-file-upload';
import { deleteFileAttachments } from '../../containers/api';
import * as translations from './translations';

export const useUploadDone = function ({
  caseId,
  onSuccess,
  onFailure,
}: {
  caseId?: string;
  onSuccess: () => void;
  onFailure: (error: Error) => void;
}): (chosenFiles: DoneNotification[] | undefined) => Promise<void> {
  return useCallback(
    async (chosenFiles: DoneNotification[] | undefined) => {
      if (!chosenFiles || chosenFiles.length === 0 || !caseId) {
        onFailure(new Error(translations.FAILED_UPLOAD));
        return;
      }

      const {
        id,
        fileJSON: { extension, mimeType },
      } = chosenFiles[0];

      try {
        if (!extension || !mimeType) {
          const error = new Error(translations.FAILED_UPLOAD);
          onFailure(error);
          throw error;
        }

        return onSuccess();
      } catch (error) {
        return deleteFileAttachments({ caseId, fileIds: [id] });
      }
    },
    [caseId, onFailure, onSuccess]
  );
};
