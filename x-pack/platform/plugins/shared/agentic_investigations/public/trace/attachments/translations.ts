/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TRACE_LABEL = i18n.translate('xpack.agenticInvestigations.trace.attachments.label', {
  defaultMessage: 'Investigation trace',
});

export const traceRowLabel = (count: number): string =>
  i18n.translate('xpack.agenticInvestigations.trace.rowLabel', {
    defaultMessage: 'Investigation trace · {count, plural, one {# step} other {# steps}}',
    values: { count },
  });
