/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AttachmentUploadContentValidator {
  /** Canonical MIME type stored with the attachment. */
  mimeType: string;
  /** Returns an error message when the content is invalid. */
  validate(content: Buffer): string | undefined;
}

/**
 * Validator registry keyed by lower-case filename extension without the dot.
 * Supplying a different registry allows the upload route's accepted formats
 * and content validation to be configured together.
 */
export type AttachmentUploadContentValidators = Readonly<
  Record<string, AttachmentUploadContentValidator>
>;

const parseJson = (content: string): string | undefined => {
  try {
    JSON.parse(content);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

export const DEFAULT_ATTACHMENT_UPLOAD_CONTENT_VALIDATORS: AttachmentUploadContentValidators = {
  json: {
    mimeType: 'application/json',
    validate: (content) => {
      const error = parseJson(content.toString('utf8'));
      return error ? `File is not valid JSON: ${error}` : undefined;
    },
  },
  ndjson: {
    mimeType: 'application/x-ndjson',
    validate: (content) => {
      const lines = content
        .toString('utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        return 'NDJSON file must contain at least one non-empty line';
      }

      for (const [index, line] of lines.entries()) {
        const error = parseJson(line);
        if (error) {
          return `NDJSON line ${index + 1} is not valid JSON: ${error}`;
        }
      }
      return undefined;
    },
  },
};

export const getAttachmentUploadExtension = (name: string): string | undefined => {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? undefined : name.slice(dot + 1).toLowerCase();
};
