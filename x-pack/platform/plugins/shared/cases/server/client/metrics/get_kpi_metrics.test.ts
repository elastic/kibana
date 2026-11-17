/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KpiMetricConfiguration } from '../../../common/types/domain';
import { CaseStatuses } from '../../../common/types/domain';
import { MAX_KPI_FILTER_CASE_IDS, MAX_TAGS_FILTER_LENGTH } from '../../../common/constants';
import type { KpiSearchRequest } from './kpi';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { prepareCasesSearch } from '../cases/search';
import { getKpiMetrics } from './get_kpi_metrics';
import { Operations } from '../../authorization';

jest.mock('../cases/search');

const prepareCasesSearchMock = prepareCasesSearch as jest.MockedFunction<typeof prepareCasesSearch>;
const casesClient = createCasesClientMock();

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
  clientArgs.analyticsV2Reader.msearch.mockResolvedValue([response, response]);

  return args;
};

describe('getKpiMetrics', () => {
  it('checks the read access of the owner', async () => {
    const clientArgs = createClientArgs({ casesList: [customMetric] });

    await getKpiMetrics({ owner: 'securitySolution' }, clientArgs, casesClient);

    expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: Operations.getCasesMetrics,
      entities: [{ owner: 'securitySolution', id: 'securitySolution' }],
    });
  });

  it('throws when the user cannot read the owner', async () => {
    const clientArgs = createClientArgs({ casesList: [customMetric] });
    clientArgs.authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

    await expect(
      getKpiMetrics({ owner: 'securitySolution' }, clientArgs, casesClient)
    ).rejects.toThrow('Unauthorized');
    expect(clientArgs.analyticsV2Reader.msearch).not.toHaveBeenCalled();
  });

  it('returns enabled false with no search when analytics v2 is disabled', async () => {
    const clientArgs = createClientArgs({ enabled: false, casesList: [customMetric] });

    const res = await getKpiMetrics({ owner: 'securitySolution' }, clientArgs, casesClient);

    expect(res).toEqual({ enabled: false, metrics: [] });
    expect(clientArgs.services.caseConfigureService.find).not.toHaveBeenCalled();
    expect(clientArgs.analyticsV2Reader.msearch).not.toHaveBeenCalled();
  });

  it('skips the predefined metrics that read the case search', async () => {
    const clientArgs = createClientArgs({ casesList: [predefinedMetric, customMetric] });

    const res = await getKpiMetrics(
      { owner: 'securitySolution', from: 'now-7d', to: 'now' },
      clientArgs,
      casesClient
    );

    expect(res).toEqual({
      enabled: true,
      metrics: [{ id: 'custom-1', type: 'value', format: 'number', value: 9, previousValue: 9 }],
    });
    expect(clientArgs.analyticsV2Reader.msearch.mock.calls[0][0]).toHaveLength(2);
  });

  it('forces the space and the owner of the request on the search', async () => {
    const clientArgs = createClientArgs({ casesList: [customMetric] });

    await getKpiMetrics({ owner: 'securitySolution' }, clientArgs, casesClient);

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

    const res = await getKpiMetrics({ owner: 'securitySolution' }, clientArgs, casesClient);

    expect(res).toEqual({ enabled: true, metrics: [] });
    expect(clientArgs.analyticsV2Reader.msearch).not.toHaveBeenCalled();
  });

  it('rejects an unknown request field', async () => {
    const clientArgs = createClientArgs({ casesList: [customMetric] });
    const params = { owner: 'securitySolution', query: 'space_id: *' };

    await expect(getKpiMetrics(params, clientArgs, casesClient)).rejects.toThrow();
  });

  describe('case list filters', () => {
    const preparedSearch = {
      caseOptions: { filter: undefined, search: 'phishing' },
      namespaces: ['default'],
      extendedFieldFilters: undefined,
      fieldLabelFilters: undefined,
      templateSOs: [],
      globalFields: [],
      ensureSavedObjectsAreAuthorized: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      prepareCasesSearchMock.mockResolvedValue(preparedSearch);
    });

    it('does not search the case ids when no filter is active', async () => {
      const clientArgs = createClientArgs({ casesList: [customMetric] });

      await getKpiMetrics(
        { owner: 'securitySolution', filters: { tags: [], search: '' } },
        clientArgs,
        casesClient
      );

      expect(prepareCasesSearchMock).not.toHaveBeenCalled();
      expect(clientArgs.services.caseService.searchCaseIds).not.toHaveBeenCalled();
      const [[request]] = clientArgs.analyticsV2Reader.msearch.mock.calls[0];
      expect(JSON.stringify(request.body.query)).not.toContain('case.id');
    });

    it('uses the case search of the list with the owner of the request and no date range', async () => {
      const clientArgs = createClientArgs({ casesList: [customMetric] });
      clientArgs.services.caseService.searchCaseIds.mockResolvedValue({ ids: ['c1'], total: 1 });

      await getKpiMetrics(
        {
          owner: 'securitySolution',
          from: 'now-7d',
          to: 'now',
          filters: { tags: ['phishing'], status: [CaseStatuses.open] },
        },
        clientArgs,
        casesClient
      );

      expect(prepareCasesSearchMock).toHaveBeenCalledWith(
        { tags: ['phishing'], status: [CaseStatuses.open], owner: 'securitySolution' },
        clientArgs,
        casesClient
      );
      expect(clientArgs.services.caseService.searchCaseIds).toHaveBeenCalledWith({
        caseOptions: preparedSearch.caseOptions,
        namespaces: ['default'],
        extendedFieldFilters: undefined,
        fieldLabelFilters: undefined,
        maxIds: MAX_KPI_FILTER_CASE_IDS,
      });
    });

    it('forces the matching case ids on the search and on the previous period', async () => {
      const clientArgs = createClientArgs({ casesList: [customMetric] });
      clientArgs.services.caseService.searchCaseIds.mockResolvedValue({
        ids: ['c1', 'c2'],
        total: 2,
      });

      await getKpiMetrics(
        { owner: 'securitySolution', from: 'now-7d', to: 'now', filters: { tags: ['phishing'] } },
        clientArgs,
        casesClient
      );

      const [requests] = clientArgs.analyticsV2Reader.msearch.mock.calls[0];
      expect(requests).toHaveLength(2);
      requests.forEach((request: KpiSearchRequest) => {
        expect(request.body.query?.bool?.filter).toEqual(
          expect.arrayContaining([{ terms: { 'case.id': ['c1', 'c2'] } }])
        );
      });
    });

    it('returns an error for each custom metric when too many cases match', async () => {
      const clientArgs = createClientArgs({ casesList: [customMetric] });
      clientArgs.services.caseService.searchCaseIds.mockResolvedValue({
        ids: [],
        total: MAX_KPI_FILTER_CASE_IDS + 1,
      });

      const res = await getKpiMetrics(
        { owner: 'securitySolution', filters: { tags: ['phishing'] } },
        clientArgs,
        casesClient
      );

      expect(res.metrics).toEqual([
        {
          id: 'custom-1',
          type: 'error',
          message: `More than ${MAX_KPI_FILTER_CASE_IDS} cases match the case list filters. Add more filters to see this metric.`,
        },
      ]);
      expect(clientArgs.analyticsV2Reader.msearch).not.toHaveBeenCalled();
    });

    it('rejects a field in the filters that is not a case list filter', async () => {
      const clientArgs = createClientArgs({ casesList: [customMetric] });
      const params = { owner: 'securitySolution', filters: { perPage: 10000 } };

      await expect(getKpiMetrics(params, clientArgs, casesClient)).rejects.toThrow();
      expect(clientArgs.services.caseService.searchCaseIds).not.toHaveBeenCalled();
    });

    it('rejects more tags than the case search allows', async () => {
      const clientArgs = createClientArgs({ casesList: [customMetric] });
      const tags = Array.from({ length: MAX_TAGS_FILTER_LENGTH + 1 }, (_, index) => `tag-${index}`);

      await expect(
        getKpiMetrics({ owner: 'securitySolution', filters: { tags } }, clientArgs, casesClient)
      ).rejects.toThrow();
      expect(clientArgs.services.caseService.searchCaseIds).not.toHaveBeenCalled();
    });

    it('does not search the case ids when the list has no custom metric', async () => {
      const clientArgs = createClientArgs({ casesList: [predefinedMetric] });

      await getKpiMetrics(
        { owner: 'securitySolution', filters: { tags: ['phishing'] } },
        clientArgs,
        casesClient
      );

      expect(clientArgs.services.caseService.searchCaseIds).not.toHaveBeenCalled();
    });
  });
});
