/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STREAM_ATTACHMENT_TYPE = 'stream';
export const STREAM_SML_TYPE = 'stream';

export type StreamType = 'wired' | 'classic' | 'query' | 'unknown';

export interface StreamAttachmentData {
  stream_name: string;
  stream_type: StreamType;
  description: string;
}
