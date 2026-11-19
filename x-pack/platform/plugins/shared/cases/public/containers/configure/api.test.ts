/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSupportedActionConnectors,
  getCaseConfigure,
  postCaseConfigure,
  patchCaseConfigure,
  fetchActionTypes,
} from './api';
import {
  caseConfigurationRequest,
  caseConfigurationResponseMock,
  casesConfigurationsMock,
} from './mock';
import { ConnectorTypes } from '../../../common/types/domain';
import { KibanaServices } from '../../common/lib/kibana';
import { actionTypesMock, connectorsMock } from '../../common/mock/connectors';

const abortCtrl = new AbortController();
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../common/lib/kibana');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

describe('Case Configuration API', () => {
  describe('fetch connectors', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(connectorsMock);
    });

    test('check url, method, signal', async () => {
      await getSupportedActionConnectors({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/cases/configure/connectors/_find', {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await getSupportedActionConnectors({ signal: abortCtrl.signal });
      expect(resp).toEqual(connectorsMock);
    });
  });

  describe('fetch configuration', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue([caseConfigurationResponseMock]);
    });

    test('check url, method, signal', async () => {
      await getCaseConfigure({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/cases/configure', {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await getCaseConfigure({
        signal: abortCtrl.signal,
      });
      expect(resp).toEqual([casesConfigurationsMock]);
    });

    test('keeps the KPI metrics of the configuration', async () => {
      const metrics = {
        casesList: [
          {
            id: 'metric-1',
            kind: 'predefined' as const,
            predefinedId: 'open_cases',
            display: 'value' as const,
          },
          {
            id: 'metric-3',
            kind: 'predefined' as const,
            predefinedId: 'alert_time_to_acknowledge_avg',
            display: 'value' as const,
            acknowledgeTrigger: 'assigned' as const,
            aggregateBy: 'case' as const,
            dateBasis: 'case_closed_at' as const,
            caseQuery: 'case.category: "IR"',
          },
          {
            id: 'metric-2',
            kind: 'custom' as const,
            label: 'Critical cases',
            index: 'cases' as const,
            query: 'case.severity: critical',
            aggregation: { type: 'avg' as const, field: 'case.time_to_resolve' },
            display: 'value' as const,
            threshold: { comparator: 'above' as const, value: 3600 },
            direction: 'lower_is_better' as const,
          },
        ],
      };
      fetchMock.mockResolvedValue([{ ...caseConfigurationResponseMock, metrics }]);

      const resp = await getCaseConfigure({ signal: abortCtrl.signal });

      expect(resp?.[0].metrics).toEqual(metrics);
    });

    test('return null on empty response', async () => {
      fetchMock.mockResolvedValue({});
      const resp = await getCaseConfigure({
        signal: abortCtrl.signal,
      });
      expect(resp).toBe(null);
    });
  });

  describe('create configuration', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(caseConfigurationResponseMock);
    });

    test('check url, body, method, signal', async () => {
      await postCaseConfigure(caseConfigurationRequest);
      expect(fetchMock).toHaveBeenCalledWith('/api/cases/configure', {
        body: '{"connector":{"id":"123","name":"My connector","type":".jira","fields":null},"owner":"securitySolution","closure_type":"close-by-user"}',
        method: 'POST',
      });
    });

    test('happy path', async () => {
      const resp = await postCaseConfigure(caseConfigurationRequest);
      expect(resp).toEqual(casesConfigurationsMock);
    });
  });

  describe('update configuration', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(caseConfigurationResponseMock);
    });

    test('check url, body, method, signal', async () => {
      await patchCaseConfigure('123', {
        connector: { id: '456', name: 'My Connector 2', type: ConnectorTypes.none, fields: null },
        version: 'WzHJ12',
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/cases/configure/123', {
        body: '{"connector":{"id":"456","name":"My Connector 2","type":".none","fields":null},"version":"WzHJ12"}',
        method: 'PATCH',
      });
    });

    test('happy path', async () => {
      const resp = await patchCaseConfigure('123', {
        connector: { id: '456', name: 'My Connector 2', type: ConnectorTypes.none, fields: null },
        version: 'WzHJ12',
      });
      expect(resp).toEqual(casesConfigurationsMock);
    });
  });

  describe('fetch actionTypes', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(actionTypesMock);
    });

    test('check url, method, signal', async () => {
      await fetchActionTypes({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/actions/connector_types', {
        method: 'GET',
        signal: abortCtrl.signal,
        query: {
          feature_id: 'cases',
        },
      });
    });

    test('happy path', async () => {
      const resp = await fetchActionTypes({ signal: abortCtrl.signal });
      expect(resp).toEqual(actionTypesMock);
    });
  });
});
