/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const FILE_DISPLAY_NAME = i18n.translate('xpack.cases.attachments.file.displayName', {
  defaultMessage: 'Files',
});

export const ACTIONS = i18n.translate('xpack.cases.caseView.files.actions', {
  defaultMessage: 'Actions',
});

export const ADD_FILE = i18n.translate('xpack.cases.caseView.files.addFile', {
  defaultMessage: 'Add file',
});

export const CLOSE_MODAL = i18n.translate('xpack.cases.caseView.files.closeModal', {
  defaultMessage: 'Close',
});

export const DATE_ADDED = i18n.translate('xpack.cases.caseView.files.dateAdded', {
  defaultMessage: 'Date added',
});

export const DELETE_FILE = i18n.translate('xpack.cases.caseView.files.deleteFile', {
  defaultMessage: 'Delete file',
});

export const DOWNLOAD_FILE = i18n.translate('xpack.cases.caseView.files.downloadFile', {
  defaultMessage: 'Download file',
});

export const COPY_FILE_HASH = i18n.translate('xpack.cases.caseView.files.copyFileHash', {
  defaultMessage: 'Copy file hash',
});

export const COPY_FILE_HASH_SUCCESS = (hashName: string) =>
  i18n.translate('xpack.cases.caseView.files.copyFileHashSuccess', {
    values: { hashName },
    defaultMessage: `Copied {hashName} file hash successfully`,
  });

export const FILES_TABLE = i18n.translate('xpack.cases.caseView.files.filesTable', {
  defaultMessage: 'Files table',
});

export const NAME = i18n.translate('xpack.cases.caseView.files.name', {
  defaultMessage: 'Name',
});

export const NO_FILES = i18n.translate('xpack.cases.caseView.files.noFilesAvailable', {
  defaultMessage: 'No files available',
});

export const NO_PREVIEW = i18n.translate('xpack.cases.caseView.files.noPreviewAvailable', {
  defaultMessage: 'No preview available',
});

export const RESULTS_COUNT = i18n.translate('xpack.cases.caseView.files.resultsCount', {
  defaultMessage: 'Showing',
});

export const TYPE = i18n.translate('xpack.cases.caseView.files.type', {
  defaultMessage: 'Type',
});

export const SEARCH_PLACEHOLDER = i18n.translate('xpack.cases.caseView.files.searchPlaceholder', {
  defaultMessage: 'Search files',
});

export const FAILED_UPLOAD = i18n.translate('xpack.cases.caseView.files.failedUpload', {
  defaultMessage: 'Failed to upload file',
});

export const SUPPORTED_FORMATS = (
  <FormattedMessage
    id="xpack.cases.caseView.files.supportedFormats"
    defaultMessage="<b>Supported formats:</b> Images, Documents, and Archives."
    values={{ b: (chunks) => <strong>{chunks}</strong> }}
  />
);

export const SUPPORTED_FORMATS_TOOLTIP_ARIA_LABEL = i18n.translate(
  'xpack.cases.caseView.files.supportedFormatsTooltipAriaLabel',
  {
    defaultMessage: 'View commonly supported file formats',
  }
);

export const SUPPORTED_FORMATS_FULL_LIST = (
  <>
    <FormattedMessage
      id="xpack.cases.caseView.files.supportedFormatsImages"
      defaultMessage="<b>Images:</b> PNG, JPEG, JPEG 2000, WebP, SVG, TIFF, BMP, AVIF, ICO, APNG, HEIC/HEIF, DjVu, DICOM, DWG, DXF, PSD, and other specialized formats."
      values={{ b: (chunks) => <strong>{chunks}</strong> }}
    />
    <br />
    <br />
    <FormattedMessage
      id="xpack.cases.caseView.files.supportedFormatsDocuments"
      defaultMessage="<b>Documents:</b> PDF, Text, CSV, JSON."
      values={{ b: (chunks) => <strong>{chunks}</strong> }}
    />
    <br />
    <br />
    <FormattedMessage
      id="xpack.cases.caseView.files.supportedFormatsArchives"
      defaultMessage="<b>Archives:</b> ZIP, GZIP, BZIP/BZIP2, 7Z, TAR."
      values={{ b: (chunks) => <strong>{chunks}</strong> }}
    />
  </>
);

export const UNSUPPORTED_FILE_TYPE_TITLE = i18n.translate(
  'xpack.cases.caseView.files.unsupportedFileTypeTitle',
  {
    defaultMessage: 'Unsupported file type',
  }
);

export const UNSUPPORTED_FILE_TYPE = (
  <FormattedMessage
    id="xpack.cases.caseView.files.unsupportedFileType"
    defaultMessage="The file type you are trying to upload is not supported.{br}{br}Supported formats include Images, Documents and Archives."
    values={{ br: <br /> }}
  />
);

export const UNKNOWN_MIME_TYPE = i18n.translate('xpack.cases.caseView.files.unknownMimeType', {
  defaultMessage: 'Unknown',
});

export const IMAGE_MIME_TYPE = i18n.translate('xpack.cases.caseView.files.imageMimeType', {
  defaultMessage: 'Image',
});

export const TEXT_MIME_TYPE = i18n.translate('xpack.cases.caseView.files.textMimeType', {
  defaultMessage: 'Text',
});

export const COMPRESSED_MIME_TYPE = i18n.translate(
  'xpack.cases.caseView.files.compressedMimeType',
  {
    defaultMessage: 'Compressed',
  }
);

export const PDF_MIME_TYPE = i18n.translate('xpack.cases.caseView.files.pdfMimeType', {
  defaultMessage: 'PDF',
});

export const SUCCESSFUL_UPLOAD_FILE_NAME = (fileName: string) =>
  i18n.translate('xpack.cases.caseView.files.successfulUploadFileName', {
    defaultMessage: 'File {fileName} uploaded successfully',
    values: { fileName },
  });

export const SHOWING_FILES = (totalFiles: number) =>
  i18n.translate('xpack.cases.caseView.files.showingFilesTitle', {
    values: { totalFiles },
    defaultMessage: 'Showing {totalFiles} {totalFiles, plural, =1 {file} other {files}}',
  });

export const ADDED = i18n.translate('xpack.cases.caseView.files.added', {
  defaultMessage: 'added ',
});

export const ADDED_UNKNOWN_FILE = i18n.translate('xpack.cases.caseView.files.addedUnknownFile', {
  defaultMessage: 'added an unknown file',
});

export const DELETE = i18n.translate('xpack.cases.caseView.files.delete', {
  defaultMessage: 'Delete',
});

export const DELETE_FILE_TITLE = i18n.translate('xpack.cases.caseView.files.deleteThisFile', {
  defaultMessage: 'Delete this file?',
});

export const REMOVED_FILE = i18n.translate('xpack.cases.caseView.files.removedFile', {
  defaultMessage: 'removed file',
});

export const DUPLICATE_FILE_WARNING = (fileName: string) =>
  i18n.translate('xpack.cases.caseView.files.duplicateFileWarning', {
    defaultMessage:
      'A file named "{fileName}" is already attached — uploading will add a second copy.',
    values: { fileName },
  });
