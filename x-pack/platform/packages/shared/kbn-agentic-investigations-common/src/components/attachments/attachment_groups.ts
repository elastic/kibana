/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Definition of a named group of attachment types. */
export interface KnownAttachmentGroup {
  /** Stable group identifier used to look up custom renderers. */
  id: string;
  /** The attachment type ids that belong to this group. */
  types: readonly string[];
  /** Localized display title for the group header. */
  title: string;
}

// Type ids are spelled out here because this package cannot import solution or platform constants.
export const ATTACHMENT_GROUPS: readonly KnownAttachmentGroup[] = [
  {
    id: 'alert',
    types: ['security.alert', 'security.alerts'],
    title: i18n.translate('xpack.alertzero.attachments.groups.alerts', {
      defaultMessage: 'Alerts',
    }),
  },
  {
    id: 'attack',
    types: ['security.attack_discovery'],
    title: i18n.translate('xpack.alertzero.attachments.groups.attacks', {
      defaultMessage: 'Attacks',
    }),
  },
  {
    id: 'entity',
    types: ['security.entity'],
    title: i18n.translate('xpack.alertzero.attachments.groups.entities', {
      defaultMessage: 'Entities',
    }),
  },
  {
    id: 'rule',
    types: ['security.rule'],
    title: i18n.translate('xpack.alertzero.attachments.groups.rules', {
      defaultMessage: 'Rules',
    }),
  },
  {
    id: 'proposal',
    types: ['platform.proposal'],
    title: i18n.translate('xpack.alertzero.attachments.groups.proposals', {
      defaultMessage: 'Proposals',
    }),
  },
];
