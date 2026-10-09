/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AI_INDEX_OWNER_LABEL: Record<'managed' | 'user', string> = {
  managed: i18n.translate('xpack.contextEngine.landing.owner.managed', {
    defaultMessage: 'Managed',
  }),
  user: i18n.translate('xpack.contextEngine.landing.owner.user', {
    defaultMessage: 'User created',
  }),
};
