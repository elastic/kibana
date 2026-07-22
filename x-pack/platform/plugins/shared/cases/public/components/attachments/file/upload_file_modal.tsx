/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiIconTip,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import numeral from '@elastic/numeral';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo } from 'react';

import type { UploadedFile } from '@kbn/shared-ux-file-upload/src/file_upload';

import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import { FileUpload } from '@kbn/shared-ux-file-upload';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import type { FileKindBrowser } from '@kbn/shared-ux-file-types';

import { FILE_ATTACHMENT_TYPE, MAX_FILE_SIZE } from '../../../../common/constants';
import { constructFileKindIdByOwner } from '../../../../common/files';
import type { Owner } from '../../../../common/constants/types';

import { useCasesToast } from '../../../common/use_cases_toast';
import { useCreateAttachments } from '../../../containers/use_create_attachments';
import { useCasesContext } from '../../cases_context/use_cases_context';
import * as i18n from './translations';
import { useRefreshCaseViewPage } from '../../case_view/use_on_refresh_case_view_page';
import { deleteFileAttachments } from '../../../containers/api';
import type { ServerError } from '../../../types';

// Static copy shown below the upload box: the accepted file size limits and
// supported formats. Kept in this file to ease backports.
const UploadFileHint = React.memo<{ kind: string }>(({ kind }) => {
  const { euiTheme } = useEuiTheme();
  const { client: filesClient } = useFilesContext();

  const maxSizeHint = useMemo(() => {
    const { maxSizeBytes } = filesClient.getFileKind(kind) as FileKindBrowser;
    // `maxSizeBytes` may be a per-file callback (Cases derives a smaller limit
    // for images), so resolve it with a representative image and non-image file.
    const resolveMax = (file: File): number =>
      typeof maxSizeBytes === 'function' ? maxSizeBytes(file) : maxSizeBytes ?? MAX_FILE_SIZE;
    const generalMax = resolveMax({ type: 'application/pdf' } as File);
    const imageMax = resolveMax({ type: 'image/png' } as File);
    const format = (bytes: number) => numeral(bytes).format('0,0.[0] b');

    return imageMax !== generalMax ? (
      <FormattedMessage
        id="xpack.cases.caseView.files.maxFileSizeHintWithImage"
        defaultMessage="<b>Maximum file size:</b> {maxSize} for Documents and Archives, {imageMaxSize} for Images."
        values={{
          maxSize: format(generalMax),
          imageMaxSize: format(imageMax),
          b: (chunks) => <strong>{chunks}</strong>,
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.cases.caseView.files.maxFileSizeHint"
        defaultMessage="<b>Maximum file size:</b> {maxSize}."
        values={{ maxSize: format(generalMax), b: (chunks) => <strong>{chunks}</strong> }}
      />
    );
  }, [filesClient, kind]);

  return (
    <EuiText
      size="xs"
      color="subdued"
      data-test-subj="cases-files-upload-hint"
      css={css`
        p {
          margin-block-end: ${euiTheme.size.xs};
        }
        p:last-of-type {
          margin-block-end: 0;
        }
      `}
    >
      {maxSizeHint && <p>{maxSizeHint}</p>}
      <p>
        {i18n.SUPPORTED_FORMATS}{' '}
        <EuiIconTip
          type="info"
          color="subdued"
          aria-label={i18n.SUPPORTED_FORMATS_TOOLTIP_ARIA_LABEL}
          content={i18n.SUPPORTED_FORMATS_FULL_LIST}
        />
      </p>
    </EuiText>
  );
});
UploadFileHint.displayName = 'UploadFileHint';

export interface UploadFileModalProps {
  caseId: string;
  onClose: () => void;
}

const UploadFileModalComponent: React.FC<UploadFileModalProps> = ({ caseId, onClose }) => {
  const { euiTheme } = useEuiTheme();
  const { owner } = useCasesContext();
  const { showDangerToast, showErrorToast, showSuccessToast } = useCasesToast();
  const { mutateAsync: createAttachments } = useCreateAttachments();
  const refreshAttachmentsTable = useRefreshCaseViewPage();
  const kind = constructFileKindIdByOwner(owner[0] as Owner);

  const onError = useCallback(
    (error: Error | ServerError) => {
      // Shared-ux tags an unsupported-type failure with a stable `code`; swap the
      // raw message for a categorized notice. Other errors pass through unchanged.
      if ((error as { code?: string }).code === 'mimeTypeNotSupported') {
        showDangerToast(i18n.UNSUPPORTED_FILE_TYPE_TITLE, i18n.UNSUPPORTED_FILE_TYPE);
        return;
      }
      showErrorToast(error, { title: i18n.FAILED_UPLOAD });
    },
    [showDangerToast, showErrorToast]
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
    <EuiModal
      data-test-subj="cases-files-add-modal"
      onClose={onClose}
      aria-label={i18n.ADD_FILE}
      css={css`
        inline-size: ${euiTheme.components.forms.maxWidth};
      `}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.ADD_FILE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <FileUpload
          kind={kind}
          onDone={onUploadDone}
          onError={onError}
          meta={{ caseIds: [caseId], owner: [owner[0]] }}
        />
        <EuiSpacer size="s" />
        <UploadFileHint kind={kind} />
      </EuiModalBody>
    </EuiModal>
  );
};

UploadFileModalComponent.displayName = 'UploadFileModal';

export const UploadFileModal = React.memo(UploadFileModalComponent);
