/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import { isUserError } from '@kbn/task-manager-plugin/server/task_running';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import { getTransformHealthRuleType } from './register_transform_health_rule_type';

describe('Transform Health Rule Type', () => {
  const mockGetFieldFormatsStart: () => FieldFormatsStart = () =>
    ({
      fieldFormatServiceFactory: jest.fn(() => ({
        deserialize: jest.fn(),
      })),
    } as any);

  const createExecutorOptions = ({
    withAlertsClient = true,
  }: { withAlertsClient?: boolean } = {}) =>
    ({
      services: {
        scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
        alertsClient: withAlertsClient
          ? {
              report: jest.fn(),
              getRecoveredAlerts: jest.fn(() => []),
              setAlertData: jest.fn(),
            }
          : null,
        uiSettingsClient: uiSettingsServiceMock.createClient(),
      },
      params: {
        includeTransforms: ['missing-transform-id'],
        excludeTransforms: null,
        testsConfig: null,
      },
      state: {},
    } as any);

  describe('Error Handling', () => {
    it('throws an error when alertsClient is missing', async () => {
      const ruleType = getTransformHealthRuleType(mockGetFieldFormatsStart);
      const options = createExecutorOptions({ withAlertsClient: false });

      let thrownError: any;
      try {
        await ruleType.executor(options);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError).toBeInstanceOf(AlertsClientError);
    });

    it.each([
      ['statusCode', { statusCode: 404 }],
      ['meta.statusCode', { meta: { statusCode: 404 } }],
    ])(
      'marks 404 errors with `%s` from the transform health service as user errors',
      async (_, errorProps) => {
        const ruleType = getTransformHealthRuleType(mockGetFieldFormatsStart);
        const options = createExecutorOptions();

        const notFoundError = Object.assign(new Error('transform not found'), errorProps);

        const mockEsClient = options.services.scopedClusterClient.asCurrentUser;
        mockEsClient.transform.getTransform = jest.fn().mockRejectedValue(notFoundError);

        let thrownError: any;
        try {
          await ruleType.executor(options);
        } catch (error) {
          thrownError = error;
        }

        expect(thrownError).toBeDefined();
        expect(thrownError.message).toContain('transform not found');
        expect(isUserError(thrownError)).toBe(true);
      }
    );

    it('does not mark non-404 errors as user errors', async () => {
      const ruleType = getTransformHealthRuleType(mockGetFieldFormatsStart);
      const options = createExecutorOptions();

      const serverError = Object.assign(new Error('Internal server error'), {
        statusCode: 500,
      });

      const mockEsClient = options.services.scopedClusterClient.asCurrentUser;
      mockEsClient.transform.getTransform = jest.fn().mockRejectedValue(serverError);

      let thrownError: any;
      try {
        await ruleType.executor(options);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBe(serverError);
      expect(isUserError(thrownError)).toBe(false);
    });
  });

  describe('Success Cases', () => {
    it('executes successfully with valid configuration', async () => {
      const ruleType = getTransformHealthRuleType(mockGetFieldFormatsStart);
      const options = createExecutorOptions();

      const mockEsClient = options.services.scopedClusterClient.asCurrentUser;
      mockEsClient.transform.getTransform = jest.fn().mockResolvedValue({
        count: 0,
        transforms: [],
      });
      mockEsClient.transform.getTransformStats = jest.fn().mockResolvedValue({
        count: 0,
        transforms: [],
      });

      const result = await ruleType.executor(options);

      expect(result).toHaveProperty('state');
      expect(result.state).toEqual({});
    });
  });
});
