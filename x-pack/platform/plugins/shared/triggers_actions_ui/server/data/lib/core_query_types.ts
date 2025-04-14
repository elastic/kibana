/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// common properties on time_series_query and alert_type_params

import { i18n } from '@kbn/i18n';

import { toElasticsearchQuery, fromKueryExpression } from '@kbn/es-query';

export function validateKuery(query: string): string | undefined {
  try {
    toElasticsearchQuery(fromKueryExpression(query));
  } catch (e) {
    return i18n.translate(
      'xpack.triggersActionsUI.data.coreQueryParams.invalidKQLQueryErrorMessage',
      {
        defaultMessage: 'Filter query is invalid.',
      }
    );
  }
}
