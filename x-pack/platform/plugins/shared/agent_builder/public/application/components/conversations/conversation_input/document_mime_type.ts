/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSupportedDocumentMimeType,
  type SupportedDocumentMimeType,
} from '@kbn/agent-builder-common/attachments';

const MIME_TYPE_BY_EXTENSION: ReadonlyMap<string, SupportedDocumentMimeType> = new Map([
  ['pdf', 'application/pdf'],
  ['md', 'text/markdown'],
  ['markdown', 'text/markdown'],
  ['txt', 'text/plain'],
]);

const DEFAULT_NAME_BY_MIME_TYPE: Readonly<Record<SupportedDocumentMimeType, string>> = {
  'application/pdf': 'document.pdf',
  'text/markdown': 'document.md',
  'text/plain': 'document.txt',
};

const getExtension = (name: string): string | undefined => {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex === -1) return undefined;
  return name.slice(dotIndex + 1).toLowerCase();
};

export const getDocumentMimeType = ({
  name,
  type,
}: Pick<File, 'name' | 'type'>): SupportedDocumentMimeType | undefined => {
  const extension = getExtension(name);
  if (extension === undefined) return isSupportedDocumentMimeType(type) ? type : undefined;
  return MIME_TYPE_BY_EXTENSION.get(extension);
};

export const getDocumentName = (file: File, mimeType: SupportedDocumentMimeType): string =>
  file.name || DEFAULT_NAME_BY_MIME_TYPE[mimeType];
