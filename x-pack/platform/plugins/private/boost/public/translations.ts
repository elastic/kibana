/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BOOST_APP_TITLE = i18n.translate('xpack.boost.appTitle', {
  defaultMessage: 'Search boost',
});

/** Boost changes aren't instant: Elasticsearch provisions resources to match them. */
export const PROVISIONING_NOTE = i18n.translate('xpack.boost.provisioningNote', {
  defaultMessage:
    'Changes take effect as resources are provisioned, which can take a while for larger projects.',
});

export const LEARN_MORE_LABEL = i18n.translate('xpack.boost.learnMoreLink', {
  defaultMessage: 'Learn more',
});
