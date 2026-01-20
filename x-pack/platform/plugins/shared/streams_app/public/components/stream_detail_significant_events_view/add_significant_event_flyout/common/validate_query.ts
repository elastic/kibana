/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamQuery } from '@kbn/streams-schema';
import { Parser } from '@kbn/esql-language';
import { i18n } from '@kbn/i18n';

export function validateQuery(query: Partial<StreamQuery>): {
  title: { isInvalid: boolean; error?: string };
  esqlWhere: { isInvalid: boolean; error?: string };
} {
  const { title = '' } = query;
  const esqlWhere = query.esql?.where ?? '';

  const isEmptyTitle = title.length === 0;
  const titleErrorMessage = isEmptyTitle
    ? i18n.translate('xpack.streams.significantEventFlyout.formFieldTitleRequiredError', {
        defaultMessage: 'Required',
      })
    : undefined;

  const isEmptyEsqlWhere = esqlWhere.length === 0;
  let esqlSyntaxError = false;
  if (!isEmptyEsqlWhere) {
    try {
      Parser.parseExpression(esqlWhere);
    } catch {
      esqlSyntaxError = true;
    }
  }

  const esqlWhereErrorMessage = esqlSyntaxError
    ? i18n.translate('xpack.streams.significantEventFlyout.formFieldQuerySyntaxError', {
        defaultMessage: 'Invalid syntax',
      })
    : isEmptyEsqlWhere
    ? i18n.translate('xpack.streams.significantEventFlyout.formFieldQueryRequiredError', {
        defaultMessage: 'Required',
      })
    : undefined;

  return {
    title: { isInvalid: Boolean(titleErrorMessage), error: titleErrorMessage },
    esqlWhere: { isInvalid: Boolean(esqlWhereErrorMessage), error: esqlWhereErrorMessage },
  };
}
