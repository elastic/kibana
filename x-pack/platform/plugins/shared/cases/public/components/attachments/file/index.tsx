/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Suspense, lazy } from 'react';

import { EuiLoadingSpinner } from '@elastic/eui';
import { FILE_ATTACHMENT_TYPE } from '../../../../common/constants';
import {
  FileAttachmentPayloadSchema,
  type FileAttachmentMetadata,
} from '../../../../common/types/domain_zod/attachment/file/v2';
import {
  AttachmentActionType,
  defineAttachment,
  type UnifiedReferenceAttachmentViewProps,
} from '../../../client/attachment_framework/types';
import * as i18n from './translations';
import { getFileFromReferenceMetadata, isImage, isValidFileMetadata } from './utils';

export type FileViewProps = UnifiedReferenceAttachmentViewProps<FileAttachmentMetadata>;

const FileAttachmentEvent = lazy(() =>
  import('./file_attachment_event').then((module) => ({ default: module.FileAttachmentEvent }))
);
const FileDeleteButton = lazy(() =>
  import('./file_delete_button').then((module) => ({ default: module.FileDeleteButton }))
);
const FileDownloadButton = lazy(() =>
  import('./file_download_button').then((module) => ({ default: module.FileDownloadButton }))
);
const FileThumbnail = lazy(() =>
  import('./file_thumbnail').then((module) => ({ default: module.FileThumbnail }))
);
const CaseViewFiles = lazy(() =>
  import('./case_view_files').then((module) => ({ default: module.CaseViewFiles }))
);

function getFileDownloadButton(fileId: string) {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <FileDownloadButton fileId={fileId} isIcon={false} />
    </Suspense>
  );
}

function getFileDeleteButton(caseId: string, fileId: string) {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <FileDeleteButton caseId={caseId} fileId={fileId} isIcon={false} />
    </Suspense>
  );
}

const getFileAttachmentActions = ({
  caseId,
  fileId,
  canDelete,
}: {
  caseId: string;
  fileId: string;
  canDelete: boolean;
}) => [
  {
    type: AttachmentActionType.CUSTOM as const,
    render: () => getFileDownloadButton(fileId),
    isPrimary: false,
  },
  ...(canDelete
    ? [
        {
          type: AttachmentActionType.CUSTOM as const,
          render: () => getFileDeleteButton(caseId, fileId),
          isPrimary: false,
        },
      ]
    : []),
];

const getFileAttachmentIcon = (props: FileViewProps) => {
  if (!isValidFileMetadata(props.metadata)) {
    return 'document';
  }

  const fileId = Array.isArray(props.attachmentId) ? props.attachmentId[0] : props.attachmentId;
  const file = getFileFromReferenceMetadata({ fileId, metadata: props.metadata });
  return isImage(file) ? 'image' : 'document';
};

const getFileCreationActivity = (props: FileViewProps) => {
  const caseId = props.caseData.id;
  const canDelete = props.permissions.delete;
  // The framework view-prop type still allows `string | string[]`; the schema
  // narrows it to `string` for `file`, but the broad output keeps the union.
  const fileId = Array.isArray(props.attachmentId) ? props.attachmentId[0] : props.attachmentId;

  if (!isValidFileMetadata(props.metadata)) {
    return {
      event: i18n.ADDED_UNKNOWN_FILE,
      getActions: () =>
        canDelete
          ? [
              {
                type: AttachmentActionType.CUSTOM as const,
                render: () => getFileDeleteButton(caseId, fileId),
                isPrimary: false,
              },
            ]
          : [],
      hideDefaultActions: true,
    };
  }

  const file = getFileFromReferenceMetadata({
    fileId,
    metadata: props.metadata,
  });

  return {
    event: (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <FileAttachmentEvent file={file} />
      </Suspense>
    ),
    getActions: () => getFileAttachmentActions({ caseId, fileId, canDelete }),
    hideDefaultActions: true,
    children: isImage(file) ? FileThumbnail : undefined,
  };
};

export const getFileAttachmentType = () =>
  defineAttachment({
    id: FILE_ATTACHMENT_TYPE,
    getIcon: getFileAttachmentIcon,
    getLabel: () => i18n.FILE_DISPLAY_NAME,
    getCreationActivity: getFileCreationActivity,
    getRemovalActivity: () => ({ event: i18n.REMOVED_FILE }),
    getAttachmentList: () => ({ children: CaseViewFiles }),
    schema: FileAttachmentPayloadSchema,
    // File attachments reference uploaded files by id; workflow authors can't
    // produce that id from YAML, so file is excluded from workflow steps.
    workflowSchema: false,
  });
