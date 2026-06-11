/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IUiSettingsClient, Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  parseLinkedCodeIndices,
  resolveCodeIndexFromMap,
  resolveCodeIndexForStream,
  resolveRepositoryForCodeIndex,
} from './resolve_code_index';

describe('resolve_code_index', () => {
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    logger = loggerMock.create();
  });

  describe('parseLinkedCodeIndices', () => {
    it('returns an empty map for undefined/empty input', () => {
      expect(parseLinkedCodeIndices(undefined, logger)).toEqual({});
      expect(parseLinkedCodeIndices('', logger)).toEqual({});
    });

    it('parses a valid JSON object of string values', () => {
      const raw = JSON.stringify({ 'logs.a': 'code-org_a', 'logs.b.*': 'code-org_b' });
      expect(parseLinkedCodeIndices(raw, logger)).toEqual({
        'logs.a': 'code-org_a',
        'logs.b.*': 'code-org_b',
      });
    });

    it('drops non-string and empty values', () => {
      const raw = JSON.stringify({ 'logs.a': 'code-org_a', 'logs.b': 123, 'logs.c': '' });
      expect(parseLinkedCodeIndices(raw, logger)).toEqual({ 'logs.a': 'code-org_a' });
    });

    it('returns empty map and warns on invalid JSON', () => {
      expect(parseLinkedCodeIndices('{not json', logger)).toEqual({});
      expect(logger.warn).toHaveBeenCalled();
    });

    it('returns empty map and warns when the value is not an object', () => {
      expect(parseLinkedCodeIndices(JSON.stringify(['a']), logger)).toEqual({});
      expect(parseLinkedCodeIndices(JSON.stringify('a'), logger)).toEqual({});
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('resolveCodeIndexFromMap', () => {
    it('resolves an exact stream-name match', () => {
      expect(resolveCodeIndexFromMap('logs.checkout', { 'logs.checkout': 'code-x' })).toBe(
        'code-x'
      );
    });

    it('prefers exact match over glob', () => {
      const mapping = { 'logs.*': 'code-glob', 'logs.checkout': 'code-exact' };
      expect(resolveCodeIndexFromMap('logs.checkout', mapping)).toBe('code-exact');
    });

    it('falls back to a glob pattern match', () => {
      expect(resolveCodeIndexFromMap('logs.checkout.api', { 'logs.checkout.*': 'code-x' })).toBe(
        'code-x'
      );
    });

    it('returns undefined when nothing matches', () => {
      expect(
        resolveCodeIndexFromMap('logs.other', { 'logs.checkout.*': 'code-x' })
      ).toBeUndefined();
    });
  });

  describe('resolveCodeIndexForStream', () => {
    const makeUiSettings = (value: string | undefined) =>
      ({ get: jest.fn().mockResolvedValue(value) } as unknown as IUiSettingsClient);

    it('reads the setting and resolves the index', async () => {
      const globalUiSettingsClient = makeUiSettings(
        JSON.stringify({ 'logs.checkout': 'code-checkout' })
      );
      await expect(
        resolveCodeIndexForStream({ streamName: 'logs.checkout', globalUiSettingsClient, logger })
      ).resolves.toBe('code-checkout');
    });

    it('returns undefined when unmapped', async () => {
      const globalUiSettingsClient = makeUiSettings(JSON.stringify({ 'logs.other': 'code-other' }));
      await expect(
        resolveCodeIndexForStream({ streamName: 'logs.checkout', globalUiSettingsClient, logger })
      ).resolves.toBeUndefined();
    });

    it('returns undefined and warns when reading the setting throws', async () => {
      const globalUiSettingsClient = {
        get: jest.fn().mockRejectedValue(new Error('boom')),
      } as unknown as IUiSettingsClient;
      await expect(
        resolveCodeIndexForStream({ streamName: 'logs.checkout', globalUiSettingsClient, logger })
      ).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('resolveRepositoryForCodeIndex', () => {
    const makeEsClient = (search: jest.Mock) => ({ search } as unknown as ElasticsearchClient);

    it('reads the repository keyword from a code index document', async () => {
      const search = jest.fn().mockResolvedValue({
        hits: { hits: [{ _source: { repository: 'acme/checkout' } }] },
      });
      await expect(
        resolveRepositoryForCodeIndex({
          esClient: makeEsClient(search),
          codeIndex: 'code-acme_checkout',
          logger,
        })
      ).resolves.toBe('acme/checkout');
      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'code-acme_checkout', size: 1 })
      );
    });

    it('returns undefined when no document carries a repository field', async () => {
      const search = jest.fn().mockResolvedValue({ hits: { hits: [] } });
      await expect(
        resolveRepositoryForCodeIndex({
          esClient: makeEsClient(search),
          codeIndex: 'code-acme_checkout',
          logger,
        })
      ).resolves.toBeUndefined();
    });

    it('returns undefined when the repository field is empty', async () => {
      const search = jest.fn().mockResolvedValue({
        hits: { hits: [{ _source: { repository: '' } }] },
      });
      await expect(
        resolveRepositoryForCodeIndex({
          esClient: makeEsClient(search),
          codeIndex: 'code-acme_checkout',
          logger,
        })
      ).resolves.toBeUndefined();
    });

    it('returns undefined and warns when the search throws', async () => {
      const search = jest.fn().mockRejectedValue(new Error('boom'));
      await expect(
        resolveRepositoryForCodeIndex({
          esClient: makeEsClient(search),
          codeIndex: 'code-acme_checkout',
          logger,
        })
      ).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
