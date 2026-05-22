/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { RULE_ATTACHMENT_TYPE, RULE_SML_TYPE } from '@kbn/alerting-v2-schemas';
import type { RulesClient } from '../../lib/rules_client';
import { RULE_SAVED_OBJECT_TYPE, type RuleSavedObjectAttributes } from '../../saved_objects';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { createRuleSmlType } from './rule_sml_type';

const baseRuleAttrs: RuleSavedObjectAttributes = {
  kind: 'alert',
  metadata: {
    name: 'High CPU',
    description: 'CPU breach detection',
    tags: ['ops', 'cpu'],
    owner: 'observability',
  },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '15m' },
  evaluation: { query: { base: 'FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name' } },
  state_transition: null,
  enabled: true,
  createdBy: 'elastic',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedBy: 'elastic',
  updatedAt: '2026-04-10T00:00:00.000Z',
} as RuleSavedObjectAttributes;

const buildSmlContext = (logger = loggingSystemMock.createLogger()) => ({
  esClient: {} as ElasticsearchClient,
  savedObjectsClient: {} as SavedObjectsClientContract,
  logger,
});

const buildToAttachmentContext = () => ({
  request: {} as KibanaRequest,
  savedObjectsClient: {} as SavedObjectsClientContract,
  spaceId: 'default',
});

describe('createRuleSmlType', () => {
  let getRule: jest.Mock;
  let getRepoSo: jest.Mock;
  let createFinder: jest.Mock;
  let repository: ISavedObjectsRepository;
  let rulesClient: RulesClient;

  beforeEach(() => {
    getRule = jest.fn();
    getRepoSo = jest.fn();
    createFinder = jest.fn();

    repository = {
      get: getRepoSo,
      createPointInTimeFinder: createFinder,
    } as unknown as ISavedObjectsRepository;

    rulesClient = { getRule } as unknown as RulesClient;
  });

  const buildDefinition = () =>
    createRuleSmlType({
      getScopedRulesClient: () => rulesClient,
      getInternalRepository: () => repository,
    });

  describe('id and fetchFrequency', () => {
    it('uses the shared RULE_SML_TYPE constant', () => {
      expect(buildDefinition().id).toBe(RULE_SML_TYPE);
    });

    it('returns "1m" as fetch frequency', () => {
      expect(buildDefinition().fetchFrequency!()).toBe('1m');
    });
  });

  describe('list', () => {
    const drainList = async () => {
      const items = [];
      const def = buildDefinition();
      for await (const page of def.list(buildSmlContext())) {
        items.push(...page);
      }
      return items;
    };

    it('yields items from the saved objects finder and closes it when done', async () => {
      const close = jest.fn().mockResolvedValue(undefined);
      const find = jest.fn(async function* () {
        yield {
          saved_objects: [
            {
              id: 'rule-1',
              updated_at: '2026-04-10T00:00:00.000Z',
              namespaces: ['default', 'space-a'],
            },
            {
              id: 'rule-2',
              updated_at: '2026-04-11T00:00:00.000Z',
              namespaces: ['default'],
            },
          ],
        };
      });
      createFinder.mockReturnValue({ find, close });

      const items = await drainList();

      expect(items).toEqual([
        {
          id: 'rule-1',
          updatedAt: '2026-04-10T00:00:00.000Z',
          spaces: ['default', 'space-a'],
        },
        { id: 'rule-2', updatedAt: '2026-04-11T00:00:00.000Z', spaces: ['default'] },
      ]);
      expect(createFinder).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RULE_SAVED_OBJECT_TYPE,
          namespaces: ['*'],
          fields: [],
        })
      );
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('falls back to "default" namespace and a fresh timestamp when missing', async () => {
      const close = jest.fn().mockResolvedValue(undefined);
      const find = jest.fn(async function* () {
        yield {
          saved_objects: [{ id: 'rule-no-meta' }],
        };
      });
      createFinder.mockReturnValue({ find, close });

      const items = await drainList();

      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({
        id: 'rule-no-meta',
        spaces: ['default'],
        updatedAt: expect.any(String),
      });
      expect(() => new Date(items[0].updatedAt).toISOString()).not.toThrow();
    });

    it('closes the finder even if iteration throws', async () => {
      const close = jest.fn().mockResolvedValue(undefined);
      const find = jest.fn(async function* () {
        yield { saved_objects: [{ id: 'rule-1' }] };
        throw new Error('boom');
      });
      createFinder.mockReturnValue({ find, close });

      await expect(drainList()).rejects.toThrow('boom');
      expect(close).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSmlData', () => {
    it('returns a single chunk built from rule metadata + query', async () => {
      getRepoSo.mockResolvedValueOnce({ id: 'rule-1', attributes: baseRuleAttrs });

      const result = await buildDefinition().getSmlData('rule-1', buildSmlContext());

      expect(getRepoSo).toHaveBeenCalledWith(RULE_SAVED_OBJECT_TYPE, 'rule-1');
      expect(result).toEqual({
        chunks: [
          {
            type: RULE_SML_TYPE,
            title: 'High CPU',
            content: [
              'High CPU',
              'CPU breach detection',
              'alert',
              'ops, cpu',
              baseRuleAttrs.evaluation!.query!.base,
            ].join('\n'),
            permissions: [`api:${ALERTING_V2_API_PRIVILEGES.rules.read}`],
          },
        ],
      });
    });

    it('falls back to originId for title when metadata.name is missing', async () => {
      getRepoSo.mockResolvedValueOnce({
        id: 'rule-bare',
        attributes: {
          ...baseRuleAttrs,
          metadata: undefined,
        } as unknown as RuleSavedObjectAttributes,
      });

      const result = await buildDefinition().getSmlData('rule-bare', buildSmlContext());

      expect(result?.chunks[0].title).toBe('rule-bare');
    });

    it('returns undefined and logs a warning when the saved object lookup throws', async () => {
      getRepoSo.mockRejectedValueOnce(new Error('not found'));
      const logger = loggingSystemMock.createLogger();

      const result = await buildDefinition().getSmlData('rule-missing', buildSmlContext(logger));

      expect(result).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("SML rule: failed to get data for 'rule-missing'")
      );
    });
  });

  describe('toAttachment', () => {
    const buildSmlDocument = (overrides: Partial<{ origin_id: string }> = {}) => ({
      id: 'sml-1',
      type: RULE_SML_TYPE,
      title: 'High CPU',
      origin_id: 'rule-1',
      content: '',
      created_at: '2026-04-10T00:00:00.000Z',
      updated_at: '2026-04-10T00:00:00.000Z',
      spaces: ['default'],
      permissions: [],
      ...overrides,
    });

    it('returns an attachment input wrapping the parsed rule', async () => {
      getRule.mockResolvedValueOnce({
        ...baseRuleAttrs,
        id: 'rule-1',
      });

      const result = await buildDefinition().toAttachment(
        buildSmlDocument(),
        buildToAttachmentContext()
      );

      expect(getRule).toHaveBeenCalledWith({ id: 'rule-1' });
      expect(result?.type).toBe(RULE_ATTACHMENT_TYPE);
      expect(result?.data).toEqual(expect.objectContaining({ id: 'rule-1', kind: 'alert' }));
    });

    it('returns undefined when getRule throws', async () => {
      getRule.mockRejectedValueOnce(new Error('not found'));

      const result = await buildDefinition().toAttachment(
        buildSmlDocument({ origin_id: 'rule-missing' }),
        buildToAttachmentContext()
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when the response fails schema parsing', async () => {
      getRule.mockResolvedValueOnce({ id: 'rule-broken' });

      const result = await buildDefinition().toAttachment(
        buildSmlDocument({ origin_id: 'rule-broken' }),
        buildToAttachmentContext()
      );

      expect(result).toBeUndefined();
    });
  });
});
