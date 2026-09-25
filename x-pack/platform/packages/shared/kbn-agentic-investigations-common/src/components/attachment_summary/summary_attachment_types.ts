/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * A kind of attachment the summary lists. `types` is a list because one kind can be carried by
 * more than one attachment type — an alert arrives either on its own or as a batch — and the
 * types sharing a name also share a rank, so they interleave by time rather than forming
 * separate blocks.
 */
export interface SummaryAttachmentType {
  /** Shown to the user as the kind of a single attachment, e.g. "Alert". */
  name: string;
  /** Attachment type ids of this kind. */
  types: readonly string[];
}

/**
 * The attachment kinds the summary lists, in display order.
 *
 * Anything absent is deliberately excluded: the summary carries what identifies the
 * investigation, not everything attached to it. Types added later stay out until listed here.
 *
 * The ids mirror `SecurityAgentBuilderAttachments` in the security_solution plugin, and
 * `AGENT_BUILDER_BUILTIN_ATTACHMENTS` in `@kbn/agent-builder-server` is the registry of every
 * valid id. They are spelled out rather than imported because this package cannot depend on a
 * solution plugin.
 */
export const SUMMARY_ATTACHMENT_TYPES: readonly SummaryAttachmentType[] = [
  {
    name: i18n.translate('xpack.alertzero.attachmentSummary.types.attack', {
      defaultMessage: 'Attack',
    }),
    types: ['security.attack_discovery'],
  },
  {
    name: i18n.translate('xpack.alertzero.attachmentSummary.types.alert', {
      defaultMessage: 'Alert',
    }),
    types: ['security.alert', 'security.alerts'],
  },
  {
    name: i18n.translate('xpack.alertzero.attachmentSummary.types.rule', {
      defaultMessage: 'Rule',
    }),
    types: ['security.rule'],
  },
  {
    name: i18n.translate('xpack.alertzero.attachmentSummary.types.entity', {
      defaultMessage: 'Entity',
    }),
    types: ['security.entity'],
  },
];
