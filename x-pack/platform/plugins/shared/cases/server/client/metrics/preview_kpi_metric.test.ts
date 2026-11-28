/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KpiMetricPreviewRequest } from '../../../common/types/api';
import { createCasesClientMockArgs } from '../mocks';
import { previewKpiMetric } from './preview_kpi_metric';
import { Operations } from '../../authorization';

const request: KpiMetricPreviewRequest = {
  owner: 'securitySolution',
  from: 'now-30d',
  to: 'now',
  metric: {
    kind: 'custom',
    label: 'Critical cases',
    index: 'cases',
    query: 'case.severity: critical',
    display: 'value',
  },
};

const createClientArgs = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const clientArgs = createCasesClientMockArgs();
  const args = {
    ...clientArgs,
    config: {
      ...clientArgs.config,
      analyticsV2: { ...clientArgs.config.analyticsV2, enabled },
    },
  };

  const response = {
    took: 1,
    timed_out: false,
    status: 200,
    _shards: { total: 1, successful: 1, failed: 0 },
    hits: { total: { value: 4, relation: 'eq' as const }, hits: [] },
  };
  clientArgs.analyticsV2Reader.msearch.mockResolvedValue([response]);

  return args;
};

describe('previewKpiMetric', () => {
  it('checks the settings access of the owner', async () => {
    const clientArgs = createClientArgs();

    await previewKpiMetric(request, clientArgs);

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: Operations.updateConfiguration,
      entities: [{ owner: 'securitySolution', id: 'securitySolution' }],
    });
  });

  it('throws with no search when the user cannot edit the settings', async () => {
    const clientArgs = createClientArgs();
    clientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

    await expect(previewKpiMetric(request, clientArgs)).rejects.toThrow('Unauthorized');
    expect(clientArgs.analyticsV2Reader.msearch).not.toHaveBeenCalled();
  });

  it('returns the value of the metric', async () => {
    const clientArgs = createClientArgs();

    const res = await previewKpiMetric(request, clientArgs);

    expect(res).toEqual({
      id: 'preview',
      type: 'value',
      format: 'number',
      value: 4,
    });
  });

  it('forces the space and the owner of the request on the search', async () => {
    const clientArgs = createClientArgs();

    await previewKpiMetric(
      { ...request, metric: { ...request.metric, query: 'space_id: * or owner: *' } },
      clientArgs
    );

    const [[searchRequest]] = clientArgs.analyticsV2Reader.msearch.mock.calls[0];
    expect(searchRequest.body.query?.bool?.filter).toEqual(
      expect.arrayContaining([
        { term: { space_id: 'default' } },
        { term: { owner: 'securitySolution' } },
      ])
    );
  });

  it('returns an error result with no search for a KQL syntax error', async () => {
    const clientArgs = createClientArgs();

    const res = await previewKpiMetric(
      { ...request, metric: { ...request.metric, query: 'status: closed or (space_id: *' } },
      clientArgs
    );

    expect(res).toEqual(expect.objectContaining({ id: 'preview', type: 'error' }));
    expect(clientArgs.analyticsV2Reader.msearch).not.toHaveBeenCalled();
  });

  it('returns an error result with no search when analytics v2 is disabled', async () => {
    const clientArgs = createClientArgs({ enabled: false });

    const res = await previewKpiMetric(request, clientArgs);

    expect(res).toEqual({
      id: 'preview',
      type: 'error',
      message: 'Case analytics is not enabled.',
    });
    expect(clientArgs.analyticsV2Reader.msearch).not.toHaveBeenCalled();
  });

  it('rejects an unknown request field', async () => {
    const clientArgs = createClientArgs();
    const params = { ...request, spaceId: 'other-space' };

    await expect(previewKpiMetric(params, clientArgs)).rejects.toThrow();
    expect(clientArgs.analyticsV2Reader.msearch).not.toHaveBeenCalled();
  });
});
