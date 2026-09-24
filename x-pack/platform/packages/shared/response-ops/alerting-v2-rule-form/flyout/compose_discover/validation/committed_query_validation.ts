/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RuleQuery } from '../../../form/types';

const QUERY_REQUIRED_ERROR = i18n.translate(
  'xpack.alertingV2.composeDiscover.validation.queryRequiredError',
  { defaultMessage: 'Define a query in the editor before continuing' }
);

/**
 * RHF `rules.validate` for the committed query field.
 * Returns `true` when valid, otherwise an i18n error message.
 *
 * Only `base` is required — the breach segment is optional, since a rule
 * without one treats every row of `base` as a breach.
 */
export const validateCommittedQuery = (
  query: RuleQuery,
  queryCommitted: boolean
): true | string => {
  if (!queryCommitted) {
    return QUERY_REQUIRED_ERROR;
  }
  return query.base.trim().length > 0 ? true : QUERY_REQUIRED_ERROR;
};

/** Shared boolean gate for footer submit / step helpers. */
export const isCommittedQueryValid = (query: RuleQuery, queryCommitted: boolean): boolean =>
  validateCommittedQuery(query, queryCommitted) === true;
