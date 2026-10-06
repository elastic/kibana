/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A kind of attachment the summary lists. `types` is a list because one kind can be carried by
 * more than one attachment type — an alert arrives either on its own or as a batch — and the
 * types sharing a rank interleave by time rather than forming separate blocks.
 */
export interface SummaryAttachmentType {
  types: readonly string[];
}

// Spelled out (not imported) — this package cannot depend on a solution plugin.
export const SUMMARY_ATTACHMENT_TYPES: readonly SummaryAttachmentType[] = [
  { types: ['security.alert', 'security.alerts'] },
  { types: ['security.attack_discovery'] },
  { types: ['security.entity'] },
  { types: ['security.rule'] },
];
