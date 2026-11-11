/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';
import {
  buildAttachmentFramework,
  getAttachmentsByTypeData,
  getFileStats,
  sanitizeTypeKey,
} from './attachments_by_type';

describe('attachments_by_type', () => {
  describe('sanitizeTypeKey', () => {
    it('replaces dots with underscores', () => {
      expect(sanitizeTypeKey('security.alert')).toBe('security_alert');
      expect(sanitizeTypeKey('ml.anomaly_swimlane')).toBe('ml_anomaly_swimlane');
      expect(sanitizeTypeKey('discoverSession')).toBe('discoverSession');
    });
  });

  describe('getFileStats', () => {
    it('rounds the average size and maps top mime types', () => {
      expect(
        getFileStats({
          averageSize: { value: 1.6 },
          topMimeTypes: {
            buckets: [
              { doc_count: 5, key: 'image/png' },
              { doc_count: 1, key: 'application/json' },
            ],
          },
        })
      ).toEqual({
        averageSize: 2,
        topMimeTypes: [
          { name: 'image/png', count: 5 },
          { name: 'application/json', count: 1 },
        ],
      });
    });

    it('returns zero/empty defaults when the aggregation is missing', () => {
      expect(getFileStats(undefined)).toEqual({ averageSize: 0, topMimeTypes: [] });
    });
  });

  describe('buildAttachmentFramework', () => {
    it('computes per-type average, sanitizes keys and folds in file stats', () => {
      const framework = buildAttachmentFramework({
        rawScope: {
          byType: {
            'security.alert': { total: 20 },
            comment: { total: 5 },
          },
          bySavedObject: { legacy: { total: 8 }, unified: { total: 2 } },
        },
        filesAggregations: { averageSize: { value: 100 }, topMimeTypes: { buckets: [] } },
        totalCasesForOwner: 4,
      });

      expect(framework).toEqual({
        attachmentFramework: {
          attachmentsByType: {
            security_alert: { total: 20, average: 5 },
            comment: { total: 5, average: 1 },
          },
          bySavedObject: { legacy: { total: 8 }, unified: { total: 2 } },
          files: { averageSize: 100, topMimeTypes: [] },
        },
      });
    });

    it('returns an empty framework when the raw scope is missing', () => {
      const framework = buildAttachmentFramework({ totalCasesForOwner: 0 });
      expect(framework.attachmentFramework.attachmentsByType).toEqual({});
      expect(framework.attachmentFramework.bySavedObject).toEqual({
        legacy: { total: 0 },
        unified: { total: 0 },
      });
    });

    it('uses average 0 when the owner has no cases', () => {
      const framework = buildAttachmentFramework({
        rawScope: {
          byType: { comment: { total: 5 } },
          bySavedObject: { legacy: { total: 5 }, unified: { total: 0 } },
        },
        totalCasesForOwner: 0,
      });
      expect(framework.attachmentFramework.attachmentsByType.comment.average).toBe(0);
    });
  });

  describe('getAttachmentsByTypeData', () => {
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsClient);

    const mockResponse = (aggregations: object) => ({
      total: 0,
      saved_objects: [],
      per_page: 0,
      page: 0,
      aggregations,
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('normalizes legacy keys, entity-counts alerts/events and merges both saved objects', async () => {
      const legacyAgg = {
        securitySolution: {
          doc_count: 20,
          types: {
            buckets: [
              { key: 'user', doc_count: 3 },
              // umbrella keys are handled by dedicated aggs and must be skipped
              { key: 'externalReference', doc_count: 99 },
              { key: 'persistableState', doc_count: 99 },
            ],
          },
          alert: { doc_count: 4, entityTotal: { value: 10 } },
          event: { doc_count: 2, entityTotal: { value: 5 } },
          externalReferenceTypes: {
            buckets: [
              { key: 'endpoint', doc_count: 2 },
              { key: '.files', doc_count: 5 },
            ],
          },
          persistableReferenceTypes: {
            buckets: [{ key: '.lens', doc_count: 4 }],
          },
        },
      };

      const unifiedAgg = {
        securitySolution: {
          doc_count: 7,
          types: {
            buckets: [
              { key: 'security.alert', doc_count: 1, entityTotal: { value: 7 } },
              { key: 'comment', doc_count: 2, entityTotal: { value: 0 } },
              { key: 'file', doc_count: 3, entityTotal: { value: 0 } },
              { key: 'dashboard', doc_count: 1, entityTotal: { value: 0 } },
            ],
          },
        },
      };

      savedObjectsClient.find.mockResolvedValueOnce(mockResponse(legacyAgg));
      savedObjectsClient.find.mockResolvedValueOnce(mockResponse(unifiedAgg));

      const res = await getAttachmentsByTypeData({
        savedObjectsClient: telemetrySavedObjectsClient,
      });

      const sec = res.securitySolution.byType;

      // legacy `user` + unified `comment` merge
      expect(sec.comment).toEqual({ total: 5 });
      // legacy alert (entity 10) + unified security.alert (entity 7)
      expect(sec['security.alert']).toEqual({ total: 17 });
      // legacy event counted by entity (eventId)
      expect(sec['security.event']).toEqual({ total: 5 });
      // `endpoint` external ref -> unified security.endpoint
      expect(sec['security.endpoint']).toEqual({ total: 2 });
      // legacy `.files` + unified `file`
      expect(sec.file).toEqual({ total: 8 });
      // legacy `.lens` -> unified lens
      expect(sec.lens).toEqual({ total: 4 });
      // unified-only type
      expect(sec.dashboard).toEqual({ total: 1 });
      // umbrella legacy `type` values are not emitted directly
      expect(sec.externalReference).toBeUndefined();
      expect(sec.persistableState).toBeUndefined();

      // entity-aware: legacy = user(3) + alert(10) + event(5) + endpoint(2) + .files(5) + .lens(4) = 29
      // unified = security.alert(7, by entity) + comment(2) + file(3) + dashboard(1) = 13
      expect(res.securitySolution.bySavedObject).toEqual({
        legacy: { total: 29 },
        unified: { total: 13 },
      });

      // only securitySolution has data, so `all` mirrors it
      expect(res.all.bySavedObject).toEqual({ legacy: { total: 29 }, unified: { total: 13 } });
      expect(res.all.byType['security.alert']).toEqual({ total: 17 });
    });

    it('assigns owner-specific alert/event type names', async () => {
      const legacyAlertOnly = (owner: string) => ({
        [owner]: {
          doc_count: 1,
          types: { buckets: [] },
          alert: { doc_count: 1, entityTotal: { value: 3 } },
          event: { doc_count: 0, entityTotal: { value: 0 } },
          externalReferenceTypes: { buckets: [] },
          persistableReferenceTypes: { buckets: [] },
        },
      });

      savedObjectsClient.find.mockResolvedValueOnce(
        mockResponse({
          ...legacyAlertOnly('securitySolution'),
          ...legacyAlertOnly('observability'),
          ...legacyAlertOnly('cases'),
        })
      );
      savedObjectsClient.find.mockResolvedValueOnce(mockResponse({}));

      const res = await getAttachmentsByTypeData({
        savedObjectsClient: telemetrySavedObjectsClient,
      });

      expect(res.securitySolution.byType['security.alert']?.total).toBe(3);
      expect(res.observability.byType['observability.alert']?.total).toBe(3);
      expect(res.cases.byType['stack.alert']?.total).toBe(3);
    });

    it('queries the two attachment saved objects', async () => {
      savedObjectsClient.find.mockResolvedValue(mockResponse({}));

      await getAttachmentsByTypeData({ savedObjectsClient: telemetrySavedObjectsClient });

      const types = savedObjectsClient.find.mock.calls.map((call) => call[0].type);
      expect(types).toContain('cases-comments');
      expect(types).toContain('cases-attachments');
    });
  });
});
