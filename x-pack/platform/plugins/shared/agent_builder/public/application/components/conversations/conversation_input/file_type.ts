/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentType,
  isSupportedBinaryMimeType,
  type SupportedBinaryMimeType,
  type TextAttachmentData,
} from '@kbn/agent-builder-common/attachments';

export const TEXT_FILE_MIME_TYPES = ['text/markdown', 'text/plain', 'text/csv'] as const;
export type TextFileMimeType = (typeof TEXT_FILE_MIME_TYPES)[number];
export type FileMimeType = SupportedBinaryMimeType | TextFileMimeType;

export const MAX_TEXT_FILE_BYTES = 256 * 1024;
// Same attachment_read budget as MAX_BINARY_TEXT_LENGTH on the server.
export const MAX_TEXT_FILE_LENGTH = 60_000;

const MIME_TYPE_BY_EXTENSION: ReadonlyMap<string, FileMimeType> = new Map([
  ['pdf', 'application/pdf'],
  ['md', 'text/markdown'],
  ['markdown', 'text/markdown'],
  ['txt', 'text/plain'],
  ['csv', 'text/csv'],
]);

const DEFAULT_NAME_BY_MIME_TYPE: Readonly<Record<FileMimeType, string>> = {
  'application/pdf': 'file.pdf',
  'text/markdown': 'file.md',
  'text/plain': 'file.txt',
  'text/csv': 'file.csv',
};

const TYPE_LABEL_BY_MIME_TYPE: Readonly<Record<FileMimeType, string>> = {
  'application/pdf': 'PDF',
  'text/markdown': 'MD',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
};

export const isTextFileMimeType = (value: unknown): value is TextFileMimeType =>
  TEXT_FILE_MIME_TYPES.some((mimeType) => mimeType === value);

const isFileMimeType = (value: unknown): value is FileMimeType =>
  isSupportedBinaryMimeType(value) || isTextFileMimeType(value);

const getExtension = (name: string): string | undefined => {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex === -1) return undefined;
  return name.slice(dotIndex + 1).toLowerCase();
};

export const getFileMimeType = ({
  name,
  type,
}: Pick<File, 'name' | 'type'>): FileMimeType | undefined => {
  const extension = getExtension(name);
  if (extension === undefined) return isFileMimeType(type) ? type : undefined;
  return MIME_TYPE_BY_EXTENSION.get(extension);
};

export const getFileAttachmentKind = (mimeType: FileMimeType): 'binary' | 'text' =>
  isSupportedBinaryMimeType(mimeType) ? 'binary' : 'text';

export const getFileName = (file: File, mimeType: FileMimeType): string =>
  file.name || DEFAULT_NAME_BY_MIME_TYPE[mimeType];

/** The mime type stored with the file, or the one taken from its name while it has none. */
export const resolveFileMimeType = ({
  name,
  mimeType,
}: {
  name: string;
  mimeType?: string;
}): FileMimeType | undefined =>
  isFileMimeType(mimeType) ? mimeType : getFileMimeType({ name, type: '' });

/** A short label for the file type, for example `PDF`. */
export const getFileTypeLabel = (mimeType: FileMimeType): string =>
  TYPE_LABEL_BY_MIME_TYPE[mimeType];

/** The file name of a `text` attachment that comes from a file, otherwise undefined. */
export const getTextFileName = (attachment: { type: string; data?: unknown }): string | undefined =>
  attachment.type === AttachmentType.text
    ? (attachment.data as Partial<TextAttachmentData> | undefined)?.name
    : undefined;
