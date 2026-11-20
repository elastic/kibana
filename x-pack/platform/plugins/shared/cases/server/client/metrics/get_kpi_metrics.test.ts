/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KpiMetricConfiguration } from '../../../common/types/domain';
import { createCasesClientMockArgs } from '../mocks';
import { getKpiMetrics } from './get_kpi_metrics';
import { Operations } from '../../authorization';

const customMetric: KpiMetricConfiguration = {
  id: 'custom-1',
  kind: 'custom',
  label: 'Critical closed',
  index: 'cases',
  query: 'case.severity: critical',
  display: 'value',
};

const predefinedMetric: KpiMetricConfiguration = {
  id: 'predefined-1',
  kind: 'predefined',
  predefinedId: 'open_cases',
  display: 'value',
};

const createClientArgs = ({
  enabled = true,
  casesList,
}: {
  enabled?: boolean;
  casesList?: KpiMetricConfiguration[];
}) => {
  const clientArgs = createCasesClientMockArgs();
  const args = {
    ...clientArgs,
    config: {
      ...clientArgs.config,
      analyticsV2: { ...clientArgs.config.analyticsV2, enabled },
    },
  };

  clientArgs.services.caseConfigureService.find.mockResolvedValue({
    saved_objects: casesList ? [{ id: 'config-1', attributes: { metrics: { casesList } } }] : [],
    total: casesList ? 1 : 0,
    per_page: 20,
    page: 1,
  } as unknown as Awaited<ReturnType<typeof clientArgs.services.caseConfigureService.find>>);

  const response = {
    took: 1,
    timed_out: false,
    status: 200,
    _shards: { total: 1, successful: 1, failed: 0 },
    hits: { total: { value: 9, relation: 'eq' as const }, hits: [] },
  };
  clientArgs.analyticsV2Reader.msearch.mockResolvedValue([response]);

  return args;
};

describe('getKpiMetrics', () => {
  it('checks the read access of the owner', async () => {
    const clientArgs = createClientArgs({ casesList: [customMetric] });

    await getKpiMetrics({ owner: 'securitySolution' }, clientArgs);

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: Operations.getCasesMetrics,
      entities: [{ owner: 'securitySolution', id: 'securitySolution' }],
    });
  });

  it('throws when the user cannot read the owner', async () => {
    const clientArgs = createClientArgs({ casesList: [customMetric] });
    clientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

    await expect(getKpiMetrics({ owner: 'securitySolution' }, clientArgs)).rejects.toThrow(
      'Unauthorized'
    );
    expect(clientArgs.analyticsV2Reader.msearch).not.toHaveBeenCalled();
  });

  it('returns enabled false with no search when analytics v2 is disabled', async () => {
    const clientArgs = createClientArgs({ enabled: false, casesList: [customMetric] });

    const res = await getKpiMetrics({ owner: 'securitySolution' }, clientArgs);

    expect(res).toEqual({ enabled: false, metrics: [] });
    expect(clientArgs.services.caseConfigureService.find).not.toHaveBeenCalled();
    expect(clientArgs.analyticsV2Reader.msearch).not.toHaveBeenCalled();
  });

  it('skips the predefined metrics that read the case search', async () => {
    const clientArgs = createClientArgs({ casesList: [predefinedMetric, customMetric] });

    const res = await getKpiMetrics(
      { owner: 'securitySolution', from: 'now-7d', to: 'now' },
      clientArgs
    );

    expect(res).toEqual({
      enabled: true,
      metrics: [{ id: 'custom-1', type: 'value', format: 'number', value: 9 }],
    });
    expect(clientArgs.analyticsV2Reader.msearch.mock.calls[0][0]).toHaveLength(1);
  });

  it('forces the space and the owner of the request on the search', async () => {
    const clientArgs = createClientArgs({ casesList: [customMetric] });

    await getKpiMetrics({ owner: 'securitySolution' }, clientArgs);

    const [[request]] = clientArgs.analyticsV2Reader.msearch.mock.calls[0];
    expect(request.body.query?.bool?.filter).toEqual(
      expect.arrayContaining([
        { term: { space_id: 'default' } },
        { term: { owner: 'securitySolution' } },
      ])
    );
  });

  it('returns no metrics when there is no saved configuration', async () => {
    const clientArgs = createClientArgs({});

    const res = await getKpiMetrics({ owner: 'securitySolution' }, clientArgs);

    expect(res).toEqual({ enabled: true, metrics: [] });
    expect(clientArgs.analyticsV2Reader.msearch).not.toHaveBeenCalled();
  });

  it('rejects an unknown request field', async () => {
    const clientArgs = createClientArgs({ casesList: [customMetric] });
    const params = { owner: 'securitySolution', query: 'space_id: *' };

    await expect(getKpiMetrics(params, clientArgs)).rejects.toThrow();
  });
});
