/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileEntry } from '@kbn/agent-builder-server/runner/filestore';

/** Per-entry metadata stored on attachment FileEntries. */
export interface AttachmentEntryMeta {
  /** Original file name. */
  name: string;
  /** MIME type. */
  mime: string;
  /** File size in bytes. */
  size: number;
}

export type AttachmentFileEntry<TData extends object = object> = FileEntry<
  TData,
  AttachmentEntryMeta
>;

/** Body stored as `content.raw` for attachment entries. */
export interface AttachmentRawBody {
  /** Raw file content (UTF-8 for text files). */
  body: string;
}
