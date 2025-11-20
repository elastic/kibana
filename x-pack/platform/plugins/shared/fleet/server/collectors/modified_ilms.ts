/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getILMPolicies } from '../services/epm/elasticsearch/template/default_settings';

export async function getModifiedILMs(): Promise<string[]> {
  const dataStreamTypes = ['logs', 'metrics', 'synthetics'];
  const ilmPolicies = await getILMPolicies(dataStreamTypes);
  const modifiedILMs: string[] = [];

  ilmPolicies.forEach((policies, dataStreamType) => {
    const { deprecatedILMPolicy, newILMPolicy } = policies;
    if ((deprecatedILMPolicy?.version ?? 1) > 1) {
      modifiedILMs.push(dataStreamType);
    }
    if ((newILMPolicy?.version ?? 1) > 1) {
      modifiedILMs.push(`${dataStreamType}@lifecycle`);
    }
  });
  return modifiedILMs;
}
