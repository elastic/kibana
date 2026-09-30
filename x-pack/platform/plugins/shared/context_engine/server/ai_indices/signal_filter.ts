/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

/**
 * Returns a translated error message when the signal filter is not valid KQL,
 * or `undefined` when it parses. Parsing at write time keeps a typo from
 * silently disabling every scheduled run that reads the filter back.
 *
 * This lives on the server so the KQL parser stays out of the browser bundle.
 */
export const validateSignalFilter = (value: string): string | undefined => {
  try {
    fromKueryExpression(value);
    return undefined;
  } catch (error) {
    return i18n.translate('xpack.contextEngine.feedbackAnalysis.error.invalidSignalFilter', {
      defaultMessage: 'Must be a valid KQL query: {reason}',
      values: { reason: error instanceof Error ? error.message : String(error) },
    });
  }
};
