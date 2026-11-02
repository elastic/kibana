/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { getThresholdRuleVisualizationData } from './index_threshold_api';

describe('getThresholdRuleVisualizationData', () => {
  const model = {
    index: ['logs-*'],
    timeField: '@timestamp',
    aggType: 'count',
    groupBy: 'all',
    termField: undefined,
    termSize: undefined,
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    threshold: [1],
    thresholdComparator: '>',
  };

  const visualizeOptions = {
    rangeFrom: '2024-01-01T00:00:00.000Z',
    rangeTo: '2024-01-02T00:00:00.000Z',
    interval: '1m',
  };

  let httpPost: jest.Mock;

  beforeEach(() => {
    httpPost = jest.fn().mockResolvedValue({ results: [] });
  });

  it('includes project_routing in the request body when projectRouting is set', async () => {
    const http = { post: httpPost } as unknown as HttpSetup;

    await getThresholdRuleVisualizationData({
      model,
      visualizeOptions,
      http,
      projectRouting: '_alias:*',
    });

    expect(httpPost).toHaveBeenCalledTimes(1);
    const body = JSON.parse(httpPost.mock.calls[0][1].body as string);
    expect(body.project_routing).toBe('_alias:*');
    expect(body.index).toEqual(model.index);
    expect(body.timeField).toBe(model.timeField);
  });

  it('omits project_routing from the request body when projectRouting is undefined', async () => {
    const http = { post: httpPost } as unknown as HttpSetup;

    await getThresholdRuleVisualizationData({
      model,
      visualizeOptions,
      http,
    });

    const body = JSON.parse(httpPost.mock.calls[0][1].body as string);
    expect(body).not.toHaveProperty('project_routing');
  });
});
