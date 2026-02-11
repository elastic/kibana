/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { types } from '@kbn/storage-adapter';

export const STREAM_NAMES = 'stream.names';
export const ATTACHMENT_UUID = 'attachment.uuid';
export const ATTACHMENT_ID = 'attachment.id';
export const ATTACHMENT_TYPE = 'attachment.type';

export const attachmentStorageSettings = {
  name: '.kibana_streams_attachments',
  schema: {
    properties: {
      [ATTACHMENT_UUID]: types.keyword(),
      [ATTACHMENT_ID]: types.keyword(),
      [ATTACHMENT_TYPE]: types.keyword(),
      [STREAM_NAMES]: types.keyword(),
    },
  },
} satisfies IndexStorageSettings;

export type AttachmentStorageSettings = typeof attachmentStorageSettings;
