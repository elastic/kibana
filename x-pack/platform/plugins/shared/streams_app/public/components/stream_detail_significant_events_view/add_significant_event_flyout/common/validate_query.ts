/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamQueryKql } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { fromKueryExpression } from '@kbn/es-query';

export function validateQuery(query: Partial<StreamQueryKql>): {
  title: { isInvalid: boolean; error?: string };
  kql: { isInvalid: boolean; error?: string };
} {
  const { title = '', kql: { query: kqlQuery } = { query: '' } } = query;

  const isEmptyTitle = title.length === 0;
  const titleErrorMessage = isEmptyTitle
    ? i18n.translate('xpack.streams.significantEventFlyout.formFieldTitleRequiredError', {
        defaultMessage: 'Required',
      })
    : undefined;

  const isEmptyKql = kqlQuery.length === 0;
  let kqlSyntaxError = false;
  if (!isEmptyKql) {
    try {
      fromKueryExpression(kqlQuery);
    } catch (error) {
      kqlSyntaxError = true;
    }
  }

  const kqlErrorMessage = kqlSyntaxError
    ? i18n.translate('xpack.streams.significantEventFlyout.formFieldQuerySyntaxError', {
        defaultMessage: 'Invalid syntax',
      })
    : isEmptyKql
    ? i18n.translate('xpack.streams.significantEventFlyout.formFieldQueryRequiredError', {
        defaultMessage: 'Required',
      })
    : undefined;

  return {
    title: { isInvalid: Boolean(titleErrorMessage), error: titleErrorMessage },
    kql: { isInvalid: Boolean(kqlErrorMessage), error: kqlErrorMessage },
  };
}
