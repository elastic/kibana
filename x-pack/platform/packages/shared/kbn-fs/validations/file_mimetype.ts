/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { filetypemime } from 'magic-bytes.js';
import path from 'path';
const allowedMimeTypes = [
  'text/plain',
  'text/markdown',
  'application/json',
  'text/yaml',
  'text/csv',
  'image/svg+xml',
  'image/png',
];

const textBasedExtensionToMime = new Map<string, string>([
  ['.json', 'application/json'],
  ['.yml', 'text/yaml'],
  ['.yaml', 'text/yaml'],
  ['.md', 'text/markdown'],
  ['.txt', 'text/plain'],
  ['.log', 'text/plain'],
  ['.csv', 'text/csv'],
]);

export function validateMimeType(buffer: Buffer, filePath: string): string[] {
  const fileExtension = path.extname(filePath).toLowerCase();

  // cannot determine mime type from magic bytes
  if (textBasedExtensionToMime.has(fileExtension)) {
    return [textBasedExtensionToMime.get(fileExtension)!];
  }

  const possibleMimeTypes = filetypemime(buffer);

  if (!possibleMimeTypes || possibleMimeTypes.length === 0) {
    throw new Error(`Unable to determine content types for file`);
  }

  const hasAllowedMimeType = possibleMimeTypes.some((mime: string) =>
    allowedMimeTypes.includes(mime)
  );

  if (!hasAllowedMimeType) {
    throw new Error(
      `Potential invalid mimetypes detected: "${possibleMimeTypes.join(
        ', '
      )}". Allowed mimetypes: ${allowedMimeTypes.join(', ')}`
    );
  }

  return possibleMimeTypes;
}
