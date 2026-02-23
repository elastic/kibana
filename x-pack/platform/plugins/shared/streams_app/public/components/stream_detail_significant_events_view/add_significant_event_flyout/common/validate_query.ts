/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamQuery } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { fromKueryExpression } from '@kbn/es-query';
import { Parser } from '@kbn/esql-language';

function isNativeEsql(query: Partial<StreamQuery>): boolean {
  const kqlQuery = query.kql?.query ?? '';
  const esqlQuery = query.esql?.query ?? '';
  return kqlQuery.length === 0 && esqlQuery.length > 0;
}

export function validateQuery(query: Partial<StreamQuery>): {
  title: { isInvalid: boolean; error?: string };
  kql: { isInvalid: boolean; error?: string };
} {
  const { title = '' } = query;

  const isEmptyTitle = title.length === 0;
  const titleErrorMessage = isEmptyTitle
    ? i18n.translate('xpack.streams.significantEventFlyout.formFieldTitleRequiredError', {
        defaultMessage: 'Required',
      })
    : undefined;

  if (isNativeEsql(query)) {
    const esqlQuery = query.esql!.query;
    let esqlSyntaxError = false;
    try {
      const { errors } = Parser.parse(esqlQuery);
      esqlSyntaxError = errors.length > 0;
    } catch {
      esqlSyntaxError = true;
    }

    const esqlErrorMessage = esqlSyntaxError
      ? i18n.translate('xpack.streams.significantEventFlyout.formFieldQuerySyntaxError', {
          defaultMessage: 'Invalid syntax',
        })
      : undefined;

    return {
      title: { isInvalid: Boolean(titleErrorMessage), error: titleErrorMessage },
      kql: { isInvalid: Boolean(esqlErrorMessage), error: esqlErrorMessage },
    };
  }

  const kqlQuery = query.kql?.query ?? '';
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
