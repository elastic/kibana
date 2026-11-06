/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getAgentPoliciesKuery = ({
  search,
  fieldPrefix,
  hiddenPolicyName,
}: {
  search: string;
  fieldPrefix: string;
  hiddenPolicyName: string;
}): string => {
  const kueryHidePolicy = `NOT ${fieldPrefix}.name:"${hiddenPolicyName}"`;
  const trimmedSearch = search.trim();
  if (!trimmedSearch) {
    return kueryHidePolicy;
  }
  // Free text is not valid in a saved object filter, combining it with another clause would make the server search for the whole string
  // A colon inside quotes is part of a phrase, not a field query
  const withoutQuoted = trimmedSearch.replace(/"(?:[^"\\]|\\.)*"/g, '');
  return withoutQuoted.includes(':')
    ? `(${kueryHidePolicy}) AND (${trimmedSearch})`
    : trimmedSearch;
};
