/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { replaceKqlCommasWithOr } from './replace_kql_commas_with_or';
import { removeKqlEmptyStrings } from './remove_kql_empty_strings';
import { removeKqlVariables } from './remove_kql_variables';

export const replaceKQLParts = (kqlQuery: string): string => {
  const kqlWithCommasExpandedToOr = replaceKqlCommasWithOr(kqlQuery);
  const kqlWithoutEmptyString = removeKqlEmptyStrings(kqlWithCommasExpandedToOr);
  const kqlWithoutVariables = removeKqlVariables(kqlWithoutEmptyString);
  return kqlWithoutVariables;
};
