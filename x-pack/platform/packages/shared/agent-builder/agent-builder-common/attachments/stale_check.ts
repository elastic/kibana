/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from './attachments';

export type StaleAttachment = Attachment & { is_stale: true; origin: string };

export interface FreshAttachment {
  id: string;
  is_stale: false;
}

export type AttachmentStaleCheckResult = StaleAttachment | FreshAttachment;
