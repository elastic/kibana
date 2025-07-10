/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { fromKueryExpression } from '@kbn/es-query';
import type { StreamQueryKql } from '@kbn/streams-schema';

export function useSignificantEventValidation({
  queryValues,
}: {
  queryValues: Partial<StreamQueryKql>;
}) {
  const validation = useMemo(() => {
    const { title = '', kql: { query: kqlQuery } = { query: '' } } = queryValues;
    const titleEmptyError = title.length === 0;
    const kqlEmptyError = kqlQuery.length === 0;

    const titleErrorMessage = titleEmptyError
      ? i18n.translate('xpack.streams.significantEventFlyout.formFieldTitleRequiredError', {
          defaultMessage: 'Required',
        })
      : undefined;

    let kqlSyntaxError = false;

    if (!kqlEmptyError) {
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
      : kqlEmptyError
      ? i18n.translate('xpack.streams.significantEventFlyout.formFieldQueryRequiredError', {
          defaultMessage: 'Required',
        })
      : undefined;

    return {
      title: titleErrorMessage,
      kql: kqlErrorMessage,
    };
  }, [queryValues]);

  return validation;
}
