/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

const defaultExample =
  'transaction.duration.us > 300000 AND http.response.status_code >= 400';

const processorEventLabels = {
  transaction: {
    label: i18n.translate('xpack.apm.kueryBar.processorEvents.transactions', {
      defaultMessage: 'transactions'
    }),
    example: 'transaction.duration.us > 300000'
  },
  error: {
    label: i18n.translate('xpack.apm.kueryBar.processorEvents.errors', {
      defaultMessage: 'errors'
    }),
    example: 'http.response.status_code >= 400'
  },
  metric: {
    label: i18n.translate('xpack.apm.kueryBar.processorEvents.metrics', {
      defaultMessage: 'metrics'
    }),
    example: 'process.pid = "1234"'
  }
};

export { defaultExample, processorEventLabels };
