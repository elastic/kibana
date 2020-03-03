/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Rule,
  RuleError,
  RuleResponseBuckets,
} from '../../../../containers/detection_engine/rules';

/**
 * Separates rules/errors from bulk rules API response (create/update/delete)
 *
 * @param response Array<Rule | RuleError> from bulk rules API
 */
export const bucketRulesResponse = (response: Array<Rule | RuleError>) =>
  response.reduce<RuleResponseBuckets>(
    (acc, cv): RuleResponseBuckets => {
      return 'error' in cv
        ? { rules: [...acc.rules], errors: [...acc.errors, cv] }
        : { rules: [...acc.rules, cv], errors: [...acc.errors] };
    },
    { rules: [], errors: [] }
  );

export const showRulesTable = ({
  rulesCustomInstalled,
  rulesInstalled,
}: {
  rulesCustomInstalled: number | null;
  rulesInstalled: number | null;
}) =>
  (rulesCustomInstalled != null && rulesCustomInstalled > 0) ||
  (rulesInstalled != null && rulesInstalled > 0);
