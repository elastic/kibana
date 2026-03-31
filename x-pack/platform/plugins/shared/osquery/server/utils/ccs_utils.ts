/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export const hasConnectedRemoteClusters = async (
  esClient: ElasticsearchClient
): Promise<boolean> => {
  const response = await esClient.cluster.remoteInfo();
  for (const remoteName in response) {
    if (!Object.hasOwn(response, remoteName)) {
      continue;
    }

    if (response[remoteName].connected) {
      return true;
    }
  }

  return false;
};

export const prefixIndexPatternsWithCcs = (indexPattern: string, ccsEnabled: boolean): string => {
  if (!ccsEnabled) {
    return indexPattern;
  }

  const patterns = indexPattern.split(',');
  const ccsPatterns = patterns.map((p) => `*:${p}`);

  return [...patterns, ...ccsPatterns].join(',');
};
