/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getPolicyIdsSubsetScriptFilter(policyIds: string[]) {
  return {
    script: {
      script: {
        source: `
          if (!doc.containsKey('policy_ids') || doc['policy_ids'].size() == 0) return false;
          for (id in doc['policy_ids']) {
            if (!params.policyIds.contains(id)) return false;
          }
          return true;
        `,
        lang: 'painless',
        params: {
          policyIds,
        },
      },
    },
  };
}
