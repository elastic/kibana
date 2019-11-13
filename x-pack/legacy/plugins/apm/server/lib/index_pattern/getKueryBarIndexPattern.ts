/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { StaticIndexPattern } from 'ui/index_patterns';
import { APICaller } from 'src/core/server';
import { IndexPatternsFetcher } from '../../../../../../../src/plugins/data/server';
import { Setup } from '../helpers/setup_request';

export const getKueryBarIndexPattern = async ({
  request,
  processorEvent,
  setup
}: {
  request: Legacy.Request;
  processorEvent?: 'transaction' | 'error' | 'metric';
  setup: Setup;
}) => {
  const { indices } = setup;

  const indexPatternsFetcher = new IndexPatternsFetcher(
    (...rest: Parameters<APICaller>) =>
      request.server.plugins.elasticsearch
        .getCluster('data')
        .callWithRequest(request, ...rest)
  );

  const indexNames = processorEvent
    ? [processorEvent]
    : ['transaction' as const, 'metric' as const, 'error' as const];

  const indicesMap = {
    transaction: indices['apm_oss.transactionIndices'],
    metric: indices['apm_oss.metricsIndices'],
    error: indices['apm_oss.errorIndices']
  };

  const configuredIndices = indexNames.map(name => indicesMap[name]);

  const fields = await indexPatternsFetcher.getFieldsForWildcard({
    pattern: configuredIndices
  });

  const pattern: StaticIndexPattern = {
    fields,
    title: configuredIndices.join(',')
  };

  return pattern;
};
