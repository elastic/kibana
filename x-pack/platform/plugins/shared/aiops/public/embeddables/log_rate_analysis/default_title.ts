/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Title shown when a log rate analysis panel has no custom title. */
export const getLogRateAnalysisDefaultTitle = (): string =>
  i18n.translate('xpack.aiops.embeddableLogRateAnalysis.attachmentTitle', {
    defaultMessage: 'Log rate analysis',
  });
