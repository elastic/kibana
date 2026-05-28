/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  KI_ATTACHMENT_TYPE,
  KI_ORIGIN_KIND_FEATURE,
  KI_ORIGIN_KIND_QUERY,
  type KnowledgeIndicatorAttachmentData,
} from '@kbn/streams-schema';
import type {
  AttachmentResolveContext,
  AttachmentFormatContext,
} from '@kbn/agent-builder-server/attachments';
import type {
  Attachment,
  VersionedAttachmentWithOrigin,
} from '@kbn/agent-builder-common/attachments';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../routes/types';
import { createKnowledgeIndicatorAttachmentType } from './knowledge_indicator_attachment_type';

const FEATURE_UUID = 'feat-uuid-a';
const QUERY_UUID = 'query-uuid-a';

const makeLogger = (): Logger => loggingSystemMock.createLogger();

const makeContext = (): AttachmentResolveContext => ({
  request: {} as KibanaRequest,
  spaceId: 'default',
  savedObjectsClient: {} as SavedObjectsClientContract,
});

const makeGetScopedClients = (
  overrides: Partial<RouteHandlerScopedClients>
): jest.MockedFunction<GetScopedClients> =>
  jest.fn(
    async () => overrides as unknown as RouteHandlerScopedClients
  ) as unknown as jest.MockedFunction<GetScopedClients>;

const featureData = (
  overrides: Partial<
    Extract<KnowledgeIndicatorAttachmentData, { kind: typeof KI_ORIGIN_KIND_FEATURE }>['feature']
  > = {}
): Extract<KnowledgeIndicatorAttachmentData, { kind: typeof KI_ORIGIN_KIND_FEATURE }> => ({
  kind: KI_ORIGIN_KIND_FEATURE,
  stream_name: 'logs.app',
  feature: {
    uuid: FEATURE_UUID,
    id: 'feature-id',
    stream_name: 'logs.app',
    type: 'service',
    subtype: 'http',
    title: 'HTTP service',
    description: 'Detected HTTP traffic',
    properties: {},
    confidence: 80,
    status: 'active',
    last_seen: '2024-06-01T00:00:00.000Z',
    tags: ['env:prod'],
    ...overrides,
  },
});

const queryData = (
  overrides: {
    query?: Partial<
      Extract<KnowledgeIndicatorAttachmentData, { kind: typeof KI_ORIGIN_KIND_QUERY }>['query']
    >;
    rule?: Partial<
      Extract<KnowledgeIndicatorAttachmentData, { kind: typeof KI_ORIGIN_KIND_QUERY }>['rule']
    >;
  } = {}
): Extract<KnowledgeIndicatorAttachmentData, { kind: typeof KI_ORIGIN_KIND_QUERY }> => ({
  kind: KI_ORIGIN_KIND_QUERY,
  stream_name: 'logs.app',
  query: {
    id: 'query-id',
    title: 'High error rate',
    description: 'Detects 5xx spike',
    type: 'match',
    esql: { query: 'FROM logs.app | WHERE status >= 500' },
    ...overrides.query,
  },
  rule: { backed: true, id: 'rule-123', ...overrides.rule },
});

const versionedAttachmentWithOrigin = (
  data: KnowledgeIndicatorAttachmentData,
  origin: string
): VersionedAttachmentWithOrigin<typeof KI_ATTACHMENT_TYPE, KnowledgeIndicatorAttachmentData> => ({
  id: 'att-1',
  type: KI_ATTACHMENT_TYPE,
  origin,
  current_version: 1,
  versions: [
    {
      version: 1,
      data,
      created_at: '2024-06-01T00:00:00.000Z',
      content_hash: 'hash-v1',
    },
  ],
});

describe('createKnowledgeIndicatorAttachmentType', () => {
  describe('validate()', () => {
    const type = createKnowledgeIndicatorAttachmentType({
      logger: makeLogger(),
      getScopedClients: jest.fn() as unknown as GetScopedClients,
    });

    it('accepts a valid feature payload', async () => {
      const result = await Promise.resolve(type.validate(featureData()));
      expect(result).toEqual({
        valid: true,
        data: expect.objectContaining({ kind: KI_ORIGIN_KIND_FEATURE }),
      });
    });

    it('accepts a valid query payload', async () => {
      const result = await Promise.resolve(type.validate(queryData()));
      expect(result).toEqual({
        valid: true,
        data: expect.objectContaining({ kind: KI_ORIGIN_KIND_QUERY }),
      });
    });

    it('rejects unknown kinds with a readable error path', async () => {
      const result = await Promise.resolve(type.validate({ ...featureData(), kind: 'other' }));
      expect(result).toEqual({ valid: false, error: expect.stringContaining('kind') });
    });

    it('rejects when required feature fields are missing', async () => {
      const broken = { ...featureData(), feature: { uuid: 'only-uuid' } };
      const result = await Promise.resolve(type.validate(broken));
      expect(result.valid).toBe(false);
    });
  });

  describe('resolve()', () => {
    it('returns undefined for an unrecognized origin string', async () => {
      const getScopedClients = makeGetScopedClients({});
      const type = createKnowledgeIndicatorAttachmentType({
        logger: makeLogger(),
        getScopedClients,
      });

      await expect(
        type.resolve!('definitely-not-a-prefix', makeContext())
      ).resolves.toBeUndefined();
      expect(getScopedClients).not.toHaveBeenCalled();
    });

    it('returns a feature payload when the caller can read the stream', async () => {
      const feature = featureData().feature;
      const featureClient = {
        findFeaturesByUuids: jest.fn(async () => [{ uuid: FEATURE_UUID, stream_name: 'logs.app' }]),
        getFeature: jest.fn(async () => feature),
      };
      const streamsClient = { getStream: jest.fn(async () => ({ name: 'logs.app' })) };

      const getScopedClients = makeGetScopedClients({
        streamsClient: streamsClient as unknown as RouteHandlerScopedClients['streamsClient'],
        getFeatureClient: (async () =>
          featureClient) as unknown as RouteHandlerScopedClients['getFeatureClient'],
        getQueryClient:
          (async () => ({})) as unknown as RouteHandlerScopedClients['getQueryClient'],
      });

      const type = createKnowledgeIndicatorAttachmentType({
        logger: makeLogger(),
        getScopedClients,
      });

      await expect(
        type.resolve!(`${KI_ORIGIN_KIND_FEATURE}:${FEATURE_UUID}`, makeContext())
      ).resolves.toEqual({
        kind: KI_ORIGIN_KIND_FEATURE,
        feature,
        stream_name: 'logs.app',
      });
    });

    it('returns undefined when stream access is denied', async () => {
      const featureClient = {
        findFeaturesByUuids: jest.fn(async () => [{ uuid: FEATURE_UUID, stream_name: 'logs.app' }]),
        getFeature: jest.fn(),
      };
      const streamsClient = {
        getStream: jest.fn(async () => {
          throw Object.assign(new Error('forbidden'), { statusCode: 403 });
        }),
      };
      const getScopedClients = makeGetScopedClients({
        streamsClient: streamsClient as unknown as RouteHandlerScopedClients['streamsClient'],
        getFeatureClient: (async () =>
          featureClient) as unknown as RouteHandlerScopedClients['getFeatureClient'],
        getQueryClient:
          (async () => ({})) as unknown as RouteHandlerScopedClients['getQueryClient'],
      });

      const type = createKnowledgeIndicatorAttachmentType({
        logger: makeLogger(),
        getScopedClients,
      });

      await expect(
        type.resolve!(`${KI_ORIGIN_KIND_FEATURE}:${FEATURE_UUID}`, makeContext())
      ).resolves.toBeUndefined();
      expect(featureClient.getFeature).not.toHaveBeenCalled();
    });

    it('returns a query payload with the rule mapped from rule_backed/rule_id', async () => {
      const queryClient = {
        findQueryLinksByUuids: jest.fn(async () => [
          {
            stream_name: 'logs.app',
            query: queryData().query,
            rule_backed: true,
            rule_id: 'rule-123',
          },
        ]),
      };
      const streamsClient = { getStream: jest.fn(async () => ({ name: 'logs.app' })) };

      const getScopedClients = makeGetScopedClients({
        streamsClient: streamsClient as unknown as RouteHandlerScopedClients['streamsClient'],
        getFeatureClient:
          (async () => ({})) as unknown as RouteHandlerScopedClients['getFeatureClient'],
        getQueryClient: (async () =>
          queryClient) as unknown as RouteHandlerScopedClients['getQueryClient'],
      });

      const type = createKnowledgeIndicatorAttachmentType({
        logger: makeLogger(),
        getScopedClients,
      });

      await expect(
        type.resolve!(`${KI_ORIGIN_KIND_QUERY}:${QUERY_UUID}`, makeContext())
      ).resolves.toEqual({
        kind: KI_ORIGIN_KIND_QUERY,
        stream_name: 'logs.app',
        query: queryData().query,
        rule: { backed: true, id: 'rule-123' },
      });
    });
  });

  describe('isStale()', () => {
    it('returns false for by-value attachments (no origin)', async () => {
      const type = createKnowledgeIndicatorAttachmentType({
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });

      // Cast through unknown: VersionedAttachmentWithOrigin requires origin, but
      // the contract is that isStale should be safe to call without one — the
      // attachment_state_manager wraps it in `attachment.origin` guard but we
      // also defend at the type level.
      const versioned = versionedAttachmentWithOrigin(featureData(), 'unused');
      const noOrigin = {
        ...versioned,
        origin: undefined,
      } as unknown as VersionedAttachmentWithOrigin<
        typeof KI_ATTACHMENT_TYPE,
        KnowledgeIndicatorAttachmentData
      >;

      await expect(type.isStale!(noOrigin, makeContext())).resolves.toBe(false);
    });

    it('detects a stale feature when last_seen has advanced', async () => {
      const snapshot = featureData({ last_seen: '2024-06-01T00:00:00.000Z' });
      const fresh = featureData({ last_seen: '2024-06-02T00:00:00.000Z' });

      const featureClient = {
        findFeaturesByUuids: jest.fn(async () => [{ uuid: FEATURE_UUID, stream_name: 'logs.app' }]),
        getFeature: jest.fn(async () => fresh.feature),
      };
      const streamsClient = { getStream: jest.fn(async () => ({ name: 'logs.app' })) };

      const getScopedClients = makeGetScopedClients({
        streamsClient: streamsClient as unknown as RouteHandlerScopedClients['streamsClient'],
        getFeatureClient: (async () =>
          featureClient) as unknown as RouteHandlerScopedClients['getFeatureClient'],
        getQueryClient:
          (async () => ({})) as unknown as RouteHandlerScopedClients['getQueryClient'],
      });

      const type = createKnowledgeIndicatorAttachmentType({
        logger: makeLogger(),
        getScopedClients,
      });

      const attachment = versionedAttachmentWithOrigin(
        snapshot,
        `${KI_ORIGIN_KIND_FEATURE}:${FEATURE_UUID}`
      );
      await expect(type.isStale!(attachment, makeContext())).resolves.toBe(true);
    });

    it('considers a feature fresh when last_seen matches the snapshot', async () => {
      const snapshot = featureData({ last_seen: '2024-06-01T00:00:00.000Z' });
      const featureClient = {
        findFeaturesByUuids: jest.fn(async () => [{ uuid: FEATURE_UUID, stream_name: 'logs.app' }]),
        getFeature: jest.fn(async () => snapshot.feature),
      };
      const streamsClient = { getStream: jest.fn(async () => ({ name: 'logs.app' })) };

      const getScopedClients = makeGetScopedClients({
        streamsClient: streamsClient as unknown as RouteHandlerScopedClients['streamsClient'],
        getFeatureClient: (async () =>
          featureClient) as unknown as RouteHandlerScopedClients['getFeatureClient'],
        getQueryClient:
          (async () => ({})) as unknown as RouteHandlerScopedClients['getQueryClient'],
      });

      const type = createKnowledgeIndicatorAttachmentType({
        logger: makeLogger(),
        getScopedClients,
      });

      const attachment = versionedAttachmentWithOrigin(
        snapshot,
        `${KI_ORIGIN_KIND_FEATURE}:${FEATURE_UUID}`
      );
      await expect(type.isStale!(attachment, makeContext())).resolves.toBe(false);
    });

    it('detects a stale query when the ESQL body changes', async () => {
      const snapshot = queryData();
      const fresh = queryData({
        query: { esql: { query: 'FROM logs.app | WHERE status >= 400' } },
      });
      const queryClient = {
        findQueryLinksByUuids: jest.fn(async () => [
          {
            stream_name: 'logs.app',
            query: fresh.query,
            rule_backed: fresh.rule.backed,
            rule_id: fresh.rule.id,
          },
        ]),
      };
      const streamsClient = { getStream: jest.fn(async () => ({ name: 'logs.app' })) };

      const getScopedClients = makeGetScopedClients({
        streamsClient: streamsClient as unknown as RouteHandlerScopedClients['streamsClient'],
        getFeatureClient:
          (async () => ({})) as unknown as RouteHandlerScopedClients['getFeatureClient'],
        getQueryClient: (async () =>
          queryClient) as unknown as RouteHandlerScopedClients['getQueryClient'],
      });

      const type = createKnowledgeIndicatorAttachmentType({
        logger: makeLogger(),
        getScopedClients,
      });

      const attachment = versionedAttachmentWithOrigin(
        snapshot,
        `${KI_ORIGIN_KIND_QUERY}:${QUERY_UUID}`
      );
      await expect(type.isStale!(attachment, makeContext())).resolves.toBe(true);
    });

    it('detects a stale query when rule_backed flips', async () => {
      const snapshot = queryData({ rule: { backed: true } });
      const queryClient = {
        findQueryLinksByUuids: jest.fn(async () => [
          {
            stream_name: 'logs.app',
            query: snapshot.query,
            rule_backed: false,
            rule_id: snapshot.rule.id,
          },
        ]),
      };
      const streamsClient = { getStream: jest.fn(async () => ({ name: 'logs.app' })) };

      const getScopedClients = makeGetScopedClients({
        streamsClient: streamsClient as unknown as RouteHandlerScopedClients['streamsClient'],
        getFeatureClient:
          (async () => ({})) as unknown as RouteHandlerScopedClients['getFeatureClient'],
        getQueryClient: (async () =>
          queryClient) as unknown as RouteHandlerScopedClients['getQueryClient'],
      });

      const type = createKnowledgeIndicatorAttachmentType({
        logger: makeLogger(),
        getScopedClients,
      });

      const attachment = versionedAttachmentWithOrigin(
        snapshot,
        `${KI_ORIGIN_KIND_QUERY}:${QUERY_UUID}`
      );
      await expect(type.isStale!(attachment, makeContext())).resolves.toBe(true);
    });

    it('returns true when the live data is gone so the user sees a resync prompt', async () => {
      const snapshot = featureData();
      const featureClient = {
        findFeaturesByUuids: jest.fn(async () => []),
        getFeature: jest.fn(),
      };
      const streamsClient = { getStream: jest.fn() };

      const getScopedClients = makeGetScopedClients({
        streamsClient: streamsClient as unknown as RouteHandlerScopedClients['streamsClient'],
        getFeatureClient: (async () =>
          featureClient) as unknown as RouteHandlerScopedClients['getFeatureClient'],
        getQueryClient:
          (async () => ({})) as unknown as RouteHandlerScopedClients['getQueryClient'],
      });

      const type = createKnowledgeIndicatorAttachmentType({
        logger: makeLogger(),
        getScopedClients,
      });

      const attachment = versionedAttachmentWithOrigin(
        snapshot,
        `${KI_ORIGIN_KIND_FEATURE}:${FEATURE_UUID}`
      );
      await expect(type.isStale!(attachment, makeContext())).resolves.toBe(true);
    });

    it('returns true when stream access has been revoked', async () => {
      const snapshot = featureData();
      const featureClient = {
        findFeaturesByUuids: jest.fn(async () => [{ stream_name: 'logs.app', uuid: FEATURE_UUID }]),
        getFeature: jest.fn(),
      };
      const streamsClient = {
        getStream: jest.fn(async () => {
          throw new Error('forbidden');
        }),
      };

      const getScopedClients = makeGetScopedClients({
        streamsClient: streamsClient as unknown as RouteHandlerScopedClients['streamsClient'],
        getFeatureClient: (async () =>
          featureClient) as unknown as RouteHandlerScopedClients['getFeatureClient'],
        getQueryClient:
          (async () => ({})) as unknown as RouteHandlerScopedClients['getQueryClient'],
      });

      const type = createKnowledgeIndicatorAttachmentType({
        logger: makeLogger(),
        getScopedClients,
      });

      const attachment = versionedAttachmentWithOrigin(
        snapshot,
        `${KI_ORIGIN_KIND_FEATURE}:${FEATURE_UUID}`
      );
      await expect(type.isStale!(attachment, makeContext())).resolves.toBe(true);
    });
  });

  describe('format()', () => {
    const type = createKnowledgeIndicatorAttachmentType({
      logger: makeLogger(),
      getScopedClients: jest.fn() as unknown as GetScopedClients,
    });

    const baseAttachment = (
      data: KnowledgeIndicatorAttachmentData
    ): Attachment<typeof KI_ATTACHMENT_TYPE, KnowledgeIndicatorAttachmentData> => ({
      id: 'att-1',
      type: KI_ATTACHMENT_TYPE,
      data,
    });
    const formatContext: AttachmentFormatContext = {
      request: {} as KibanaRequest,
      spaceId: 'default',
    };

    it('formats a feature as a structured key/value block', async () => {
      const formatted = await type.format(baseAttachment(featureData()), formatContext);
      const representation = await formatted.getRepresentation!();
      expect(representation).toEqual({
        type: 'text',
        value: [
          'Feature KI',
          'stream: logs.app',
          'title: HTTP service',
          'type: service',
          'subtype: http',
          'description: Detected HTTP traffic',
          'tags: env:prod',
          'status: active',
          'confidence: 80',
          'last_seen: 2024-06-01T00:00:00.000Z',
        ].join('\n'),
      });
    });

    it('formats a query as a structured key/value block including the ESQL body', async () => {
      const formatted = await type.format(baseAttachment(queryData()), formatContext);
      const representation = await formatted.getRepresentation!();
      expect(representation).toEqual({
        type: 'text',
        value: [
          'Significant event query KI',
          'stream: logs.app',
          'title: High error rate',
          'description: Detects 5xx spike',
          'type: match',
          'rule_backed: true',
          'rule_id: rule-123',
          'esql: FROM logs.app | WHERE status >= 500',
        ].join('\n'),
      });
    });

    it('omits falsy fields from the formatted block', async () => {
      const formatted = await type.format(
        baseAttachment(
          featureData({ subtype: undefined, tags: [], description: '', last_seen: '' as never })
        ),
        formatContext
      );
      const representation = await formatted.getRepresentation!();
      expect(representation).toEqual({
        type: 'text',
        value: [
          'Feature KI',
          'stream: logs.app',
          'title: HTTP service',
          'type: service',
          'status: active',
          'confidence: 80',
        ].join('\n'),
      });
    });
  });

  describe('contract metadata', () => {
    it('exposes no tools and a non-empty agent description', () => {
      const type = createKnowledgeIndicatorAttachmentType({
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });
      expect(type.getTools!()).toEqual([]);
      expect(type.getAgentDescription!()).toEqual(expect.stringContaining('knowledge_indicator'));
      expect(type.isReadonly).toBe(true);
    });
  });
});
