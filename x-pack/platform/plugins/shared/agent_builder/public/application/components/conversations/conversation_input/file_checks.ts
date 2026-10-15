/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import type { ToastInput } from '@kbn/core/public';
import { MAX_BINARY_BYTES, isSupportedBinaryMimeType } from '@kbn/agent-builder-common/attachments';
import { getFileMimeType, MAX_TEXT_FILE_BYTES } from './file_type';

export const MAX_FILES_PER_MESSAGE = 10;

const labels = {
  invalidType: i18n.translate('xpack.agentBuilder.fileChecks.invalidType', {
    defaultMessage: 'This file type is not supported.',
  }),
  tooMany: i18n.translate('xpack.agentBuilder.fileChecks.tooMany', {
    defaultMessage: 'You can attach up to {max} files per message.',
    values: { max: MAX_FILES_PER_MESSAGE },
  }),
};

/** Shows a toast and returns true when the file type is not supported or the file is too large. */
export const rejectInvalidFile = ({
  file,
  addErrorToast,
}: {
  file: File;
  addErrorToast: (input: ToastInput) => void;
}): boolean => {
  const mimeType = getFileMimeType(file);
  if (!mimeType) {
    addErrorToast({ title: labels.invalidType });
    return true;
  }
  const maxBytes = isSupportedBinaryMimeType(mimeType)
    ? MAX_BINARY_BYTES[mimeType]
    : MAX_TEXT_FILE_BYTES;
  if (file.size > maxBytes) {
    addErrorToast({
      title: i18n.translate('xpack.agentBuilder.fileChecks.tooLarge', {
        defaultMessage: 'The file is too large. The maximum size is {maxSize}.',
        values: { maxSize: numeral(maxBytes).format('0.[0] b') },
      }),
    });
    return true;
  }
  return false;
};

/** Blocks adding another file once `currentFileCount` has reached the per-message limit. */
export const rejectIfTooManyFiles = ({
  currentFileCount,
  addErrorToast,
}: {
  currentFileCount: number;
  addErrorToast: (input: ToastInput) => void;
}): boolean => {
  if (currentFileCount < MAX_FILES_PER_MESSAGE) return false;
  addErrorToast({ title: labels.tooMany });
  return true;
};
