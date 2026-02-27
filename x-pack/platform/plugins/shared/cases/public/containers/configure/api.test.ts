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
