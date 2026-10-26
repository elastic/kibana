/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Marks a built-in profile, which Elastic manages. */
export const MANAGED_BADGE_LABEL = i18n.translate('xpack.boost.profilesTab.managedBadge', {
  defaultMessage: 'Managed',
});

/** Marks a default rule, which applies to whatever no other rule matches. */
export const DEFAULT_BADGE_LABEL = i18n.translate('xpack.boost.rulesTab.defaultBadge', {
  defaultMessage: 'Default',
});
