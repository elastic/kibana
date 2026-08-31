/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { getWorkflowsTelemetryData } from './workflows';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';
import {
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/constants/workflow';

describe('workflows', () => {
  describe('getWorkflowsTelemetryData', () => {
    const logger = loggingSystemMock.createLogger();
    const savedObjectsRepository = savedObjectsRepositoryMock.create();
    const savedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsRepository);

    const makeRunsResponse = (
      overrides: Partial<{
        total: number;
        dailyCount: number;
        weeklyCount: number;
        monthlyCount: number;
        caseCardinality: number;
        uniqueUsers: number;
        byOriginType: Array<{ key: string; doc_count: number }>;
      }> = {}
    ) => ({
      total: overrides.total ?? 0,
      saved_objects: [],
      per_page: 0,
      page: 0,
      aggregations: {
        counts: {
          buckets: [
            { doc_count: overrides.monthlyCount ?? 0 },
            { doc_count: overrides.weeklyCount ?? 0 },
            { doc_count: overrides.dailyCount ?? 0 },
          ],
        },
        references: {
          referenceType: {
            referenceAgg: { value: overrides.caseCardinality ?? 0 },
          },
        },
        uniqueUsers: { value: overrides.uniqueUsers ?? 0 },
        byOriginType: { buckets: overrides.byOriginType ?? [] },
      },
    });

    const makeConfigResponse = (configurationsWithTags: number) => ({
      total: 0,
      saved_objects: [],
      per_page: 0,
      page: 0,
      aggregations: {
        configurationsWithTags: { doc_count: configurationsWithTags },
      },
    });

    beforeEach(() => {
      jest.clearAllMocks();
      // Default: two sequential find calls → runs then config
      savedObjectsRepository.find
        .mockResolvedValueOnce(makeRunsResponse())
        .mockResolvedValueOnce(makeConfigResponse(0));
    });

    it('returns all-zero values when there are no workflow runs', async () => {
      const result = await getWorkflowsTelemetryData({ savedObjectsClient, logger });

      expect(result).toEqual({
        runs: { total: 0, daily: 0, weekly: 0, monthly: 0 },
        totalCasesWithRuns: 0,
        totalUniqueUsers: 0,
        byOriginType: {
          case: 0,
          observable: 0,
          observables: 0,
          alert: 0,
          alerts: 0,
          bulk: 0,
        },
        configurationsWithWorkflowTags: 0,
      });
    });

    it('returns correct counts when runs exist', async () => {
      savedObjectsRepository.find.mockReset();
      savedObjectsRepository.find
        .mockResolvedValueOnce(
          makeRunsResponse({
            total: 10,
            dailyCount: 2,
            weeklyCount: 5,
            monthlyCount: 9,
            caseCardinality: 3,
            uniqueUsers: 2,
            byOriginType: [
              { key: CASE_WORKFLOW_ORIGIN_TYPE, doc_count: 6 },
              { key: OBSERVABLE_WORKFLOW_ORIGIN_TYPE, doc_count: 2 },
              { key: ALERTS_WORKFLOW_ORIGIN_TYPE, doc_count: 1 },
            ],
          })
        )
        .mockResolvedValueOnce(makeConfigResponse(4));

      const result = await getWorkflowsTelemetryData({ savedObjectsClient, logger });

      expect(result).toEqual({
        runs: { total: 10, daily: 2, weekly: 5, monthly: 9 },
        totalCasesWithRuns: 3,
        totalUniqueUsers: 2,
        byOriginType: {
          case: 6,
          observable: 2,
          observables: 0,
          alert: 0,
          alerts: 1,
          // 10 total − (6 + 2 + 1) = 1
          bulk: 1,
        },
        configurationsWithWorkflowTags: 4,
      });
    });

    it('derives bulk count as total minus sum of origin buckets', async () => {
      savedObjectsRepository.find.mockReset();
      savedObjectsRepository.find
        .mockResolvedValueOnce(
          makeRunsResponse({
            total: 5,
            byOriginType: [
              { key: CASE_WORKFLOW_ORIGIN_TYPE, doc_count: 3 },
              { key: OBSERVABLES_WORKFLOW_ORIGIN_TYPE, doc_count: 1 },
              { key: ALERT_WORKFLOW_ORIGIN_TYPE, doc_count: 1 },
            ],
          })
        )
        .mockResolvedValueOnce(makeConfigResponse(0));

      const result = await getWorkflowsTelemetryData({ savedObjectsClient, logger });

      expect(result.byOriginType.bulk).toBe(0);
    });

    it('clamps bulk to 0 when origin sum somehow exceeds total', async () => {
      savedObjectsRepository.find.mockReset();
      savedObjectsRepository.find
        .mockResolvedValueOnce(
          makeRunsResponse({
            total: 3,
            byOriginType: [{ key: CASE_WORKFLOW_ORIGIN_TYPE, doc_count: 5 }],
          })
        )
        .mockResolvedValueOnce(makeConfigResponse(0));

      const result = await getWorkflowsTelemetryData({ savedObjectsClient, logger });

      expect(result.byOriginType.bulk).toBe(0);
    });
  });
});
