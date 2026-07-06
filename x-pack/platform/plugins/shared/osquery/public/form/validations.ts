/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { QUERY_TIMEOUT } from '../../common/constants';

/**
 * Validates the live query timeout value.
 * Must be between QUERY_TIMEOUT.DEFAULT (60) and QUERY_TIMEOUT.MAX (900).
 *
 * @returns error message string if invalid, undefined if valid
 */
export const validateTimeout = (value: number): string | undefined => {
  if (value < QUERY_TIMEOUT.DEFAULT || isNaN(value)) {
    return i18n.translate('xpack.osquery.pack.queryFlyoutForm.timeoutFieldMinNumberError', {
      defaultMessage: 'The timeout value must be {timeoutInSeconds} seconds or higher.',
      values: { timeoutInSeconds: QUERY_TIMEOUT.DEFAULT },
    });
  }

  if (value > QUERY_TIMEOUT.MAX) {
    return i18n.translate('xpack.osquery.pack.queryFlyoutForm.timeoutFieldMaxNumberError', {
      defaultMessage: 'The timeout value must be {timeoutInSeconds} seconds or lower.',
      values: { timeoutInSeconds: QUERY_TIMEOUT.MAX },
    });
  }
};
