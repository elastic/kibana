/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedDocumentMimeType } from '@kbn/agent-builder-common/attachments';

export interface DocumentToTextParams {
  bytes: Buffer;
  fileId: string;
  fileName: string;
  signal: AbortSignal;
}

export interface DocumentConverter {
  /** false when this deployment cannot read the format, e.g. no Reader endpoint */
  isAvailable: () => boolean;
  toText: (params: DocumentToTextParams) => Promise<string>;
}

export type DocumentConverters = Readonly<Record<SupportedDocumentMimeType, DocumentConverter>>;
