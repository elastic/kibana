/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Index } from '@kbn/index-management-shared-types';

export const indexLifecycleDataEnricher = async (
  indicesList: Index[],
  client: IScopedClusterClient
): Promise<Index[]> => {
  if (!indicesList || !indicesList.length) {
    return [];
  }

  const { indices: ilmIndicesData } = await client.asCurrentUser.ilm.explainLifecycle({
    index: '*,.*',
  });
  return indicesList.map((index: Index) => {
    return {
      ...index,
      // simply appends ilm data if it exists
      ilm: { ...(ilmIndicesData[index.name] || {}) },
    };
  });
};
