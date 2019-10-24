/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { StaticIndexPattern } from 'ui/index_patterns';
import { IndexPatternsService } from '../../../../../../../src/legacy/server/index_patterns/service';
import { Setup } from '../helpers/setup_request';

export const getKueryBarIndexPattern = async ({
  request,
  processorEvent,
  setup
}: {
  request: Legacy.Request;
  processorEvent?: string;
  setup: Setup;
}) => {
  const { config } = setup;

  const indexPatternsService = new IndexPatternsService(
    (...args: [any, any, any]) =>
      request.server.plugins.elasticsearch
        .getCluster('data')
        .callWithRequest(request, ...args)
  );

  const indices = processorEvent
    ? [processorEvent]
    : ['transaction', 'metric', 'error'];

  const indicesFromConfig = indices.map(index =>
    index === 'metric'
      ? config.get<string>(`apm_oss.metricsIndices`)
      : config.get<string>(`apm_oss.${index}Indices`)
  );

  const fields = await indexPatternsService.getFieldsForWildcard({
    pattern: indicesFromConfig
  });

  const pattern: StaticIndexPattern = {
    fields,
    title: indicesFromConfig.join(',')
  };

  return pattern;
};
