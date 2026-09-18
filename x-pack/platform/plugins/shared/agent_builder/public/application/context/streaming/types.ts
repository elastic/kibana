/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OptimisticAttachments } from '../../utils/build_optimistic_attachments';

export type StreamType = 'send' | 'resume';

export interface ActiveStream {
  type: StreamType;
  /** Stop was pressed; the server is winding the run down. */
  cancelling?: boolean;
}

export interface StreamRecord {
  pendingMessage?: string;
  pendingAttachments?: OptimisticAttachments;
}
