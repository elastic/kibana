/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getMaxBytes, getMaxBytesFormatted } from './get_max_bytes';

/*
 * Extract file extension from file. Example: file.name "points.geojson" returns ".geojson"
 */
export function getFileExtension(file: File) {
  const extension = file.name.split('.').pop();
  return '.' + extension;
}

export function validateFile(file: File, types: string[], options?: { checkSizeLimit?: boolean }) {
  if (file.size > getMaxBytes() && options?.checkSizeLimit) {
    throw new Error(
      i18n.translate('xpack.fileUpload.fileSizeError', {
        defaultMessage: 'File size {fileSize} exceeds maximum file size of {maxFileSize}',
        values: {
          fileSize: bytesToSize(file.size),
          maxFileSize: getMaxBytesFormatted(),
        },
      })
    );
  }

  if (!file.name) {
    throw new Error(
      i18n.translate('xpack.fileUpload.noFileNameError', {
        defaultMessage: 'File name not provided',
      })
    );
  }

  if (!types.includes(getFileExtension(file))) {
    throw new Error(
      i18n.translate('xpack.fileUpload.fileTypeError', {
        defaultMessage: 'File is not one of acceptable types: {types}',
        values: {
          types: types.join(', '),
        },
      })
    );
  }
}

function bytesToSize(bytes: number) {
  if (bytes === 0) return 'n/a';
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.round(Math.floor(Math.log(bytes) / Math.log(1024)));
  if (i === 0) return `${bytes} ${sizes[i]})`;
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}
