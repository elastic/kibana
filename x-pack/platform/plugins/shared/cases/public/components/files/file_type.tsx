/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Suspense, lazy } from 'react';

import { EuiLoadingSpinner } from '@elastic/eui';
import type { FileAttachmentMetadata } from '../../../common/types/domain';
import { FILE_ATTACHMENT_TYPE } from '../../../common/constants';
import type {
  AttachmentViewObject,
  ExternalReferenceAttachmentType,
  ExternalReferenceAttachmentViewProps,
} from '../../client/attachment_framework/types';

import { AttachmentActionType } from '../../client/attachment_framework/types';
import * as i18n from './translations';
import { isImage, isValidFileExternalReferenceMetadata } from './utils';
import { FileThumbnail } from './file_thumbnail';

const getFileFromReferenceMetadata = ({
  fileId,
  externalReferenceMetadata,
}: {
  fileId: string;
  externalReferenceMetadata: FileAttachmentMetadata;
}) => {
  const fileMetadata = externalReferenceMetadata.files[0];
  return {
    id: fileId,
    ...fileMetadata,
  };
};

const FileAttachmentEvent = lazy(() =>
  import('./file_attachment_event').then((module) => ({ default: module.FileAttachmentEvent }))
);
const FileDeleteButton = lazy(() =>
  import('./file_delete_button').then((module) => ({ default: module.FileDeleteButton }))
);
const FileDownloadButton = lazy(() =>
  import('./file_download_button').then((module) => ({ default: module.FileDownloadButton }))
);

const LazyFileThumbnail = lazy<React.FC<ExternalReferenceAttachmentViewProps>>(() =>
  Promise.resolve({
    default: function FileThumbnailInline(props: ExternalReferenceAttachmentViewProps) {
      if (!isValidFileExternalReferenceMetadata(props.externalReferenceMetadata)) {
        // This check is done only for TS reasons, externalReferenceMetadata is always FileAttachmentMetadata
        return null;
      }
      const file = getFileFromReferenceMetadata({
        externalReferenceMetadata: props.externalReferenceMetadata,
        fileId: props.externalReferenceId,
      });
      return <FileThumbnail file={file} />;
    },
  })
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

const getFileAttachmentActions = ({ caseId, fileId }: { caseId: string; fileId: string }) => [
  {
    type: AttachmentActionType.CUSTOM as const,
    render: () => getFileDownloadButton(fileId),
    isPrimary: false,
  },
  {
    type: AttachmentActionType.CUSTOM as const,
    render: () => getFileDeleteButton(caseId, fileId),
    isPrimary: false,
  },
];

const getFileAttachmentViewObject = (
  props: ExternalReferenceAttachmentViewProps
): AttachmentViewObject<ExternalReferenceAttachmentViewProps> => {
  const caseId = props.caseData.id;
  const fileId = props.externalReferenceId;

  if (!isValidFileExternalReferenceMetadata(props.externalReferenceMetadata)) {
    return {
      event: i18n.ADDED_UNKNOWN_FILE,
      timelineAvatar: 'document',
      getActions: () => [
        {
          type: AttachmentActionType.CUSTOM,
          render: () => getFileDeleteButton(caseId, fileId),
          isPrimary: false,
        },
      ],
      hideDefaultActions: true,
    };
  }

  const file = getFileFromReferenceMetadata({
    fileId,
    externalReferenceMetadata: props.externalReferenceMetadata,
  });

  return {
    event: (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <FileAttachmentEvent file={file} />
      </Suspense>
    ),
    timelineAvatar: isImage(file) ? 'image' : 'document',
    getActions: () => getFileAttachmentActions({ caseId, fileId }),
    hideDefaultActions: true,
    children: isImage(file) ? LazyFileThumbnail : undefined,
  };
};

export const getFileType = (): ExternalReferenceAttachmentType => ({
  id: FILE_ATTACHMENT_TYPE,
  icon: 'document',
  displayName: 'Files',
  getAttachmentViewObject: getFileAttachmentViewObject,
  getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_FILE }),
});
