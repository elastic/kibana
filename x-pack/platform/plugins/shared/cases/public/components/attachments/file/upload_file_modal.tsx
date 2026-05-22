/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiModal, EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';
import React, { useCallback } from 'react';

import type { UploadedFile } from '@kbn/shared-ux-file-upload/src/file_upload';

import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import { FileUpload } from '@kbn/shared-ux-file-upload';

import { FILE_ATTACHMENT_TYPE } from '../../../../common/constants';
import { constructFileKindIdByOwner } from '../../../../common/files';
import type { Owner } from '../../../../common/constants/types';

import { useCasesToast } from '../../../common/use_cases_toast';
import { useCreateAttachments } from '../../../containers/use_create_attachments';
import { useCasesContext } from '../../cases_context/use_cases_context';
import * as i18n from './translations';
import { useRefreshCaseViewPage } from '../../case_view/use_on_refresh_case_view_page';
import { deleteFileAttachments } from '../../../containers/api';
import type { ServerError } from '../../../types';

export interface UploadFileModalProps {
  caseId: string;
  onClose: () => void;
}

const UploadFileModalComponent: React.FC<UploadFileModalProps> = ({ caseId, onClose }) => {
  const { owner } = useCasesContext();
  const { showDangerToast, showErrorToast, showSuccessToast } = useCasesToast();
  const { mutateAsync: createAttachments } = useCreateAttachments();
  const refreshAttachmentsTable = useRefreshCaseViewPage();

  const onError = useCallback(
    (error: Error | ServerError) => {
      showErrorToast(error, { title: i18n.FAILED_UPLOAD });
    },
    [showErrorToast]
  );

  const onUploadDone = useCallback(
    async (chosenFiles: UploadedFile[]) => {
      if (chosenFiles.length === 0) {
        showDangerToast(i18n.FAILED_UPLOAD);
        return;
      }

      const file = chosenFiles[0];

      try {
        await createAttachments({
          caseId,
          caseOwner: owner[0],
          attachments: [
            {
              type: FILE_ATTACHMENT_TYPE,
              attachmentId: file.id,
              metadata: {
                files: [
                  {
                    name: file.fileJSON.name,
                    extension: file.fileJSON.extension ?? '',
                    mimeType: file.fileJSON.mimeType ?? '',
                    created: file.fileJSON.created,
                  },
                ],
                soType: FILE_SO_TYPE,
              },
            },
          ],
        });

        refreshAttachmentsTable();
        showSuccessToast(i18n.SUCCESSFUL_UPLOAD_FILE_NAME(file.fileJSON.name));
      } catch (error) {
        // error toast is handled inside createAttachments; delete the orphan
        // file SO so retries do not leave stale uploads behind
        return deleteFileAttachments({ caseId, fileIds: [file.id] });
      }

      onClose();
    },
    [
      caseId,
      createAttachments,
      onClose,
      owner,
      refreshAttachmentsTable,
      showDangerToast,
      showSuccessToast,
    ]
  );

  return (
    <EuiModal data-test-subj="cases-files-add-modal" onClose={onClose} aria-label={i18n.ADD_FILE}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.ADD_FILE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <FileUpload
          kind={constructFileKindIdByOwner(owner[0] as Owner)}
          onDone={onUploadDone}
          onError={onError}
          meta={{ caseIds: [caseId], owner: [owner[0]] }}
        />
      </EuiModalBody>
    </EuiModal>
  );
};

UploadFileModalComponent.displayName = 'UploadFileModal';

export const UploadFileModal = React.memo(UploadFileModalComponent);
