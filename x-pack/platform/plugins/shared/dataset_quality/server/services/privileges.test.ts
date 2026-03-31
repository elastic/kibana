/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { datasetQualityPrivileges } from './privileges';

describe('DatasetQualityPrivileges', () => {
  describe('getHasIndexPrivileges - security disabled', () => {
    it('returns all-true privileges when isSecurityEnabled is false, without calling hasPrivileges', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();

      const result = await datasetQualityPrivileges.getHasIndexPrivileges(
        esClientMock,
        ['logs-test-default'],
        ['read', 'monitor'],
        false
      );

      expect(result['logs-test-default'].read).toBe(true);
      expect(result['logs-test-default'].monitor).toBe(true);
      expect(esClientMock.security.hasPrivileges).not.toHaveBeenCalled();
    });

    it('calls hasPrivileges and returns result when isSecurityEnabled is true', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      esClientMock.security.hasPrivileges.mockResolvedValue({
        has_all_requested: false,
        cluster: {},
        index: {
          'logs-test-default': { read: true, monitor: false },
        },
        application: {},
        username: 'test',
      });

      const result = await datasetQualityPrivileges.getHasIndexPrivileges(
        esClientMock,
        ['logs-test-default'],
        ['read', 'monitor'],
        true
      );

      expect(result['logs-test-default'].read).toBe(true);
      expect(result['logs-test-default'].monitor).toBe(false);
      expect(esClientMock.security.hasPrivileges).toHaveBeenCalledTimes(1);
    });

    it('re-throws errors when isSecurityEnabled is true', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      esClientMock.security.hasPrivileges.mockRejectedValue(
        new errors.ResponseError({
          body: {
            error: {
              type: 'security_exception',
              reason:
                'action [indices:data/read/xpack/security/user/has_privileges] is unauthorized',
            },
          },
          statusCode: 403,
          headers: {},
          warnings: [],
          meta: {} as never,
        })
      );

      await expect(
        datasetQualityPrivileges.getHasIndexPrivileges(
          esClientMock,
          ['logs-test-default'],
          ['read'],
          true
        )
      ).rejects.toThrow();
    });
  });

  describe('getCanViewIntegrations - security disabled', () => {
    it('returns true when isSecurityEnabled is false, without calling hasPrivileges', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();

      const result = await datasetQualityPrivileges.getCanViewIntegrations(esClientMock, false);

      expect(result).toBe(true);
      expect(esClientMock.security.hasPrivileges).not.toHaveBeenCalled();
    });

    it('calls hasPrivileges and returns result when isSecurityEnabled is true', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      esClientMock.security.hasPrivileges.mockResolvedValue({
        has_all_requested: true,
        cluster: {},
        index: {},
        application: {
          'kibana-.kibana': {
            '*': { 'feature_fleet.read': true },
          },
        },
        username: 'test',
      });

      const result = await datasetQualityPrivileges.getCanViewIntegrations(esClientMock, true);

      expect(result).toBe(true);
      expect(esClientMock.security.hasPrivileges).toHaveBeenCalledTimes(1);
    });
  });
});
