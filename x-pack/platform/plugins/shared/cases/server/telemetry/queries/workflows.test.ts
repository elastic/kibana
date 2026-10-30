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
  ATTACHMENT_WORKFLOW_ORIGIN_TYPE,
  ATTACHMENTS_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/constants/workflow';

interface ScopeOverrides {
  total: number;
  dailyCount: number;
  weeklyCount: number;
  monthlyCount: number;
  caseCardinality: number;
  uniqueUsers: number;
  byOriginType: Array<{ key: string; doc_count: number }>;
  byAttachmentType: Array<{ key: string; doc_count: number }>;
}

const makeScope = (overrides: Partial<ScopeOverrides> = {}) => ({
  doc_count: overrides.total ?? 0,
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
  byAttachmentType: { buckets: overrides.byAttachmentType ?? [] },
});

const makeRunsResponse = (
  scopes: Partial<
    Record<'all' | 'securitySolution' | 'observability' | 'cases', Partial<ScopeOverrides>>
  > = {}
) => ({
  // The hit total is capped at 10,000, so the collector must not read it.
  total: 10000,
  saved_objects: [],
  per_page: 0,
  page: 0,
  aggregations: {
    all: makeScope(scopes.all),
    securitySolution: makeScope(scopes.securitySolution),
    observability: makeScope(scopes.observability),
    cases: makeScope(scopes.cases),
  },
});

const makeConfigResponse = (
  total: number = 0,
  byOwner: Array<{ key: string; doc_count: number }> = []
) => ({
  total: 0,
  saved_objects: [],
  per_page: 0,
  page: 0,
  aggregations: {
    configurationsWithTags: { doc_count: total, byOwner: { buckets: byOwner } },
  },
});

const emptySolution = {
  runs: { total: 0, daily: 0, weekly: 0, monthly: 0 },
  totalCasesWithRuns: 0,
  totalUniqueUsers: 0,
  byOriginType: {
    case: 0,
    observable: 0,
    observables: 0,
    attachment: 0,
    attachments: 0,
    unattributed: 0,
  },
  byAttachmentType: {},
  configurationsWithWorkflowTags: 0,
};

describe('workflows', () => {
  describe('getWorkflowsTelemetryData', () => {
    const logger = loggingSystemMock.createLogger();
    const savedObjectsRepository = savedObjectsRepositoryMock.create();
    const savedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsRepository);

    const mockResponses = (
      runs: ReturnType<typeof makeRunsResponse>,
      config: ReturnType<typeof makeConfigResponse>
    ) => {
      savedObjectsRepository.find.mockReset();
      savedObjectsRepository.find.mockResolvedValueOnce(runs).mockResolvedValueOnce(config);
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockResponses(makeRunsResponse(), makeConfigResponse());
    });

    it('returns all-zero values when there are no workflow runs', async () => {
      const result = await getWorkflowsTelemetryData({ savedObjectsClient, logger });

      expect(result).toEqual({
        all: emptySolution,
        sec: emptySolution,
        obs: emptySolution,
        main: emptySolution,
      });
    });

    it('returns counts per scope from the scope aggregations', async () => {
      mockResponses(
        makeRunsResponse({
          all: {
            total: 12,
            dailyCount: 2,
            weeklyCount: 5,
            monthlyCount: 9,
            caseCardinality: 4,
            uniqueUsers: 3,
            byOriginType: [
              { key: CASE_WORKFLOW_ORIGIN_TYPE, doc_count: 6 },
              { key: OBSERVABLE_WORKFLOW_ORIGIN_TYPE, doc_count: 2 },
              { key: ATTACHMENTS_WORKFLOW_ORIGIN_TYPE, doc_count: 1 },
              { key: 'unattributed', doc_count: 3 },
            ],
            byAttachmentType: [{ key: 'security.alert', doc_count: 1 }],
          },
          securitySolution: {
            total: 10,
            byOriginType: [
              { key: CASE_WORKFLOW_ORIGIN_TYPE, doc_count: 6 },
              { key: OBSERVABLE_WORKFLOW_ORIGIN_TYPE, doc_count: 1 },
              { key: ATTACHMENTS_WORKFLOW_ORIGIN_TYPE, doc_count: 1 },
              { key: 'unattributed', doc_count: 2 },
            ],
            byAttachmentType: [{ key: 'security.alert', doc_count: 1 }],
          },
          observability: {
            total: 2,
            byOriginType: [
              { key: OBSERVABLE_WORKFLOW_ORIGIN_TYPE, doc_count: 1 },
              { key: 'unattributed', doc_count: 1 },
            ],
          },
        }),
        makeConfigResponse(5, [
          { key: 'securitySolution', doc_count: 3 },
          { key: 'cases', doc_count: 2 },
        ])
      );

      const result = await getWorkflowsTelemetryData({ savedObjectsClient, logger });

      expect(result.all).toEqual({
        runs: { total: 12, daily: 2, weekly: 5, monthly: 9 },
        totalCasesWithRuns: 4,
        totalUniqueUsers: 3,
        byOriginType: {
          case: 6,
          observable: 2,
          observables: 0,
          attachment: 0,
          attachments: 1,
          unattributed: 3,
        },
        byAttachmentType: { security_alert: 1 },
        configurationsWithWorkflowTags: 5,
      });
      expect(result.sec.runs.total).toBe(10);
      expect(result.sec.byOriginType.unattributed).toBe(2);
      expect(result.sec.byAttachmentType).toEqual({ security_alert: 1 });
      expect(result.sec.configurationsWithWorkflowTags).toBe(3);
      expect(result.obs.runs.total).toBe(2);
      expect(result.obs.byOriginType.observable).toBe(1);
      expect(result.obs.configurationsWithWorkflowTags).toBe(0);
      expect(result.main).toEqual({ ...emptySolution, configurationsWithWorkflowTags: 2 });
    });

    it('reports every attachment type that has been run against, keyed by sanitized type', async () => {
      mockResponses(
        makeRunsResponse({
          all: {
            total: 9,
            byOriginType: [
              { key: ATTACHMENT_WORKFLOW_ORIGIN_TYPE, doc_count: 5 },
              { key: ATTACHMENTS_WORKFLOW_ORIGIN_TYPE, doc_count: 4 },
            ],
            byAttachmentType: [
              { key: 'security.alert', doc_count: 5 },
              { key: 'security.event', doc_count: 3 },
              { key: 'observability.alert', doc_count: 1 },
            ],
          },
        }),
        makeConfigResponse()
      );

      const result = await getWorkflowsTelemetryData({ savedObjectsClient, logger });

      expect(result.all.byAttachmentType).toEqual({
        security_alert: 5,
        security_event: 3,
        observability_alert: 1,
      });
    });

    it('ignores origin types outside the known set', async () => {
      mockResponses(
        makeRunsResponse({
          all: {
            total: 3,
            byOriginType: [
              { key: CASE_WORKFLOW_ORIGIN_TYPE, doc_count: 1 },
              { key: 'cases.comment', doc_count: 2 },
            ],
          },
        }),
        makeConfigResponse()
      );

      const result = await getWorkflowsTelemetryData({ savedObjectsClient, logger });

      expect(result.all.byOriginType).toEqual({
        case: 1,
        observable: 0,
        observables: 0,
        attachment: 0,
        attachments: 0,
        unattributed: 0,
      });
    });

    it('scopes run aggregations to all runs and to each owner', async () => {
      await getWorkflowsTelemetryData({ savedObjectsClient, logger });

      const { aggs } = savedObjectsRepository.find.mock.calls[0][0];

      expect(aggs?.all?.filter).toEqual({
        exists: { field: 'cases-user-actions.attributes.owner' },
      });
      expect(aggs?.securitySolution?.filter).toEqual({
        term: { 'cases-user-actions.attributes.owner': 'securitySolution' },
      });
      expect(aggs?.observability?.filter).toEqual({
        term: { 'cases-user-actions.attributes.owner': 'observability' },
      });
      expect(aggs?.cases?.filter).toEqual({
        term: { 'cases-user-actions.attributes.owner': 'cases' },
      });
    });

    it('buckets runs without an origin as unattributed and aggregates attachment types by term', async () => {
      await getWorkflowsTelemetryData({ savedObjectsClient, logger });

      const { aggs } = savedObjectsRepository.find.mock.calls[0][0];

      expect(aggs?.all?.aggs?.byOriginType).toEqual({
        terms: {
          field: 'cases-user-actions.attributes.payload.origin.type',
          size: 500,
          missing: 'unattributed',
        },
      });
      expect(aggs?.all?.aggs?.byAttachmentType).toEqual({
        terms: {
          field: 'cases-user-actions.attributes.payload.origin.attachmentType',
          size: 500,
        },
      });
    });
  });
});
