/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSupportedBinaryMimeType,
  type SupportedBinaryMimeType,
} from '@kbn/agent-builder-common/attachments';

const MIME_TYPE_BY_EXTENSION: ReadonlyMap<string, SupportedBinaryMimeType> = new Map([
  ['pdf', 'application/pdf'],
  ['md', 'text/markdown'],
  ['markdown', 'text/markdown'],
  ['txt', 'text/plain'],
]);

const DEFAULT_NAME_BY_MIME_TYPE: Readonly<Record<SupportedBinaryMimeType, string>> = {
  'application/pdf': 'document.pdf',
  'text/markdown': 'document.md',
  'text/plain': 'document.txt',
};

const TYPE_LABEL_BY_MIME_TYPE: Readonly<Record<SupportedBinaryMimeType, string>> = {
  'application/pdf': 'PDF',
  'text/markdown': 'MD',
  'text/plain': 'TXT',
};

const getExtension = (name: string): string | undefined => {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex === -1) return undefined;
  return name.slice(dotIndex + 1).toLowerCase();
};

export const getFileMimeType = ({
  name,
  type,
}: Pick<File, 'name' | 'type'>): SupportedBinaryMimeType | undefined => {
  const extension = getExtension(name);
  if (extension === undefined) return isSupportedBinaryMimeType(type) ? type : undefined;
  return MIME_TYPE_BY_EXTENSION.get(extension);
};

export const getFileName = (file: File, mimeType: SupportedBinaryMimeType): string =>
  file.name || DEFAULT_NAME_BY_MIME_TYPE[mimeType];

/** The mime type stored with the document, or the one taken from its name while it has no data. */
export const resolveFileMimeType = ({
  name,
  mimeType,
}: {
  name: string;
  mimeType?: string;
}): SupportedBinaryMimeType | undefined =>
  isSupportedBinaryMimeType(mimeType) ? mimeType : getFileMimeType({ name, type: '' });

/** A short label for the file type, for example `PDF`. */
export const getFileTypeLabel = (mimeType: SupportedBinaryMimeType): string =>
  TYPE_LABEL_BY_MIME_TYPE[mimeType];
