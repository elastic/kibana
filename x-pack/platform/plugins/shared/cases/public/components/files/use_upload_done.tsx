/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import type { DoneNotification } from '@kbn/shared-ux-file-upload';
import { deleteFileAttachments } from '../../containers/api';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import { FILE_ATTACHMENT_TYPE } from '../../../common/constants';
import { AttachmentType, ExternalReferenceStorageType } from '../../../common';
import * as translations from './translations';

export const useUploadDone = function ({
  caseId,
  owner,
  onSuccess,
  onFailure,
}: {
  caseId?: string;
  owner: string[];
  onSuccess: () => void;
  onFailure: (error: Error) => void;
}) {
  const { mutateAsync: createAttachments } = useCreateAttachments();
  return useCallback(
    async (chosenFiles: DoneNotification[] | undefined) => {
      if (!chosenFiles || chosenFiles.length === 0 || !caseId) {
        onFailure(new Error(translations.FAILED_UPLOAD));
        return;
      }

      const file = chosenFiles[0];

      try {
        await createAttachments({
          caseId,
          caseOwner: owner[0],
          attachments: [
            {
              type: AttachmentType.externalReference,
              externalReferenceId: file.id,
              externalReferenceStorage: {
                type: ExternalReferenceStorageType.savedObject,
                soType: FILE_SO_TYPE,
              },
              externalReferenceAttachmentTypeId: FILE_ATTACHMENT_TYPE,
              externalReferenceMetadata: {
                files: [
                  {
                    name: file.fileJSON.name,
                    extension: file.fileJSON.extension ?? '',
                    mimeType: file.fileJSON.mimeType ?? '',
                    created: file.fileJSON.created,
                  },
                ],
              },
            },
          ],
        });

        onSuccess();
      } catch (error) {
        // error toast is handled inside  createAttachments

        // we need to delete the file if attachment creation failed
        return deleteFileAttachments({ caseId, fileIds: [file.id] });
      }
    },
    [caseId, owner, onFailure, onSuccess, createAttachments]
  );
};
