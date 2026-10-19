/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// Kept out of `translations.ts`, which template registration loads with every page: these are
// only read by the lazily loaded overview tab and header.

export const OVERVIEW_SECTION_LABELS = Object.freeze({
  subjects: i18n.translate('xpack.alertzero.detailsFlyout.sections.subjects', {
    defaultMessage: 'Subject',
  }),
  trace: i18n.translate('xpack.alertzero.detailsFlyout.sections.trace', {
    defaultMessage: 'Investigation trace',
  }),
});
