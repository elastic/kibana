/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { datasetQualityPrivileges } from './privileges';

function createSecurityDisabledResponseError(bodyText: string): errors.ResponseError {
  return new errors.ResponseError({
    body: { error: bodyText },
    statusCode: 400,
    headers: {},
    warnings: [],
    meta: {} as never,
  });
}

function createSecurityDisabledPlainTextResponseError(bodyText: string): errors.ResponseError {
  return new errors.ResponseError({
    body: bodyText,
    statusCode: 400,
    headers: {},
    warnings: [],
    meta: {} as never,
  });
}

describe('DatasetQualityPrivileges', () => {
  describe('getHasIndexPrivileges - security disabled', () => {
    it('returns all-true privileges when ES security is disabled (JSON body, lowercase)', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      esClientMock.security.hasPrivileges.mockRejectedValue(
        createSecurityDisabledResponseError(
          'no handler found for uri [/_security/user/_has_privileges] and method [POST]'
        )
      );

      const result = await datasetQualityPrivileges.getHasIndexPrivileges(
        esClientMock,
        ['logs-test-default'],
        ['read', 'monitor']
      );

      expect(result['logs-test-default'].read).toBe(true);
      expect(result['logs-test-default'].monitor).toBe(true);
    });

    it('returns all-true privileges when ES security is disabled (JSON body, uppercase)', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      esClientMock.security.hasPrivileges.mockRejectedValue(
        createSecurityDisabledResponseError(
          'No handler found for uri [/_security/user/_has_privileges] and method [POST]'
        )
      );

      const result = await datasetQualityPrivileges.getHasIndexPrivileges(
        esClientMock,
        ['logs-test-default'],
        ['read', 'monitor']
      );

      expect(result['logs-test-default'].read).toBe(true);
      expect(result['logs-test-default'].monitor).toBe(true);
    });

    it('returns all-true privileges when ES security is disabled (plain text body)', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      esClientMock.security.hasPrivileges.mockRejectedValue(
        createSecurityDisabledPlainTextResponseError(
          'No handler found for uri [/_security/user/_has_privileges] and method [POST]'
        )
      );

      const result = await datasetQualityPrivileges.getHasIndexPrivileges(
        esClientMock,
        ['logs-test-default'],
        ['read', 'monitor']
      );

      expect(result['logs-test-default'].read).toBe(true);
      expect(result['logs-test-default'].monitor).toBe(true);
    });

    it('re-throws non-security-disabled errors', async () => {
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
          ['read']
        )
      ).rejects.toThrow();
    });
  });

  describe('getCanViewIntegrations - security disabled', () => {
    it('returns true when ES security is disabled (JSON body)', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      esClientMock.security.hasPrivileges.mockRejectedValue(
        createSecurityDisabledResponseError(
          'No handler found for uri [/_security/user/_has_privileges] and method [POST]'
        )
      );

      const result = await datasetQualityPrivileges.getCanViewIntegrations(esClientMock);

      expect(result).toBe(true);
    });

    it('returns true when ES security is disabled (plain text body)', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      esClientMock.security.hasPrivileges.mockRejectedValue(
        createSecurityDisabledPlainTextResponseError(
          'No handler found for uri [/_security/user/_has_privileges] and method [POST]'
        )
      );

      const result = await datasetQualityPrivileges.getCanViewIntegrations(esClientMock);

      expect(result).toBe(true);
    });
  });
});
