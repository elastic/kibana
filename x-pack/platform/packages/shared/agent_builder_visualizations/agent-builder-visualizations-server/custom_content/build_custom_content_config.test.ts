/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import { ESQLVariableType } from '@kbn/esql-types';
import type { Logger } from '@kbn/logging';
import { generateCustomContentEsql } from '../shared/custom_content_esql';
import { buildCustomContentConfig } from './build_custom_content_config';

jest.mock('../shared/custom_content_esql', () => ({ generateCustomContentEsql: jest.fn() }));
jest.mock('@kbn/custom-content-server', () => ({ createCustomContentTemplateResolver: jest.fn() }));

const mockGenerate = generateCustomContentEsql as jest.Mock;
const mockCreateResolver = createCustomContentTemplateResolver as jest.Mock;
const mockResolveTemplate = jest.fn();

const STORED = 'FROM logs | STATS count = COUNT(*) BY host';
const GENERATED = 'FROM logs | STATS count = COUNT(*) BY machine.os';
const EXPLICIT = 'FROM logs | LIMIT 5';
const OLD_TEMPLATE = '<div>old</div>';

const deps = {
  modelProvider: {} as ModelProvider,
  logger: {} as Logger,
  events: {} as ToolEventEmitter,
  esClient: {} as IScopedClusterClient,
};

const build = (params: Partial<Parameters<typeof buildCustomContentConfig>[0]>) =>
  buildCustomContentConfig({ nlQuery: 'Show KPI', ...deps, ...params });

describe('buildCustomContentConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerate.mockResolvedValue(GENERATED);
    mockResolveTemplate.mockResolvedValue({ template: '<div>resolved</div>', height: 320 });
    mockCreateResolver.mockReturnValue(mockResolveTemplate);
  });

  describe('a new panel', () => {
    it('generates a query when none is given and writes the template from it', async () => {
      const result = await build({ hasData: true, index: 'logs-*' });

      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ nlQuery: 'Show KPI', index: 'logs-*', existingQueries: [] })
      );
      expect(mockResolveTemplate).toHaveBeenCalledWith({
        prompt: 'Show KPI',
        esqlQuery: GENERATED,
        existingTemplate: undefined,
        hasExistingQuery: false,
      });
      expect(result).toEqual({
        esqlQuery: GENERATED,
        template: '<div>resolved</div>',
        height: 320,
      });
    });

    it('uses a supplied query without generating', async () => {
      const result = await build({ esql: EXPLICIT, hasData: true });

      expect(mockGenerate).not.toHaveBeenCalled();
      expect(result.esqlQuery).toBe(EXPLICIT);
    });

    it('creates a data-free panel when hasData is false', async () => {
      const result = await build({ hasData: false });

      expect(mockGenerate).not.toHaveBeenCalled();
      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'Show KPI', esqlQuery: undefined })
      );
      expect(result.esqlQuery).toBeUndefined();
    });

    it('lets a supplied query win over hasData: false', async () => {
      expect((await build({ esql: EXPLICIT, hasData: false })).esqlQuery).toBe(EXPLICIT);
    });

    it('treats a blank supplied query as not supplied', async () => {
      const result = await build({ esql: '  ', hasData: true });

      expect(mockGenerate).toHaveBeenCalledTimes(1);
      expect(result.esqlQuery).toBe(GENERATED);
    });

    it('passes the time range to the generation', async () => {
      const timeRange = { from: 'now-7d', to: 'now' };
      await build({ hasData: true, timeRange });

      expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({ timeRange }));
    });

    it('propagates a generation failure instead of writing a data-free panel', async () => {
      mockGenerate.mockRejectedValue(new Error('Could not generate an ES|QL query'));

      await expect(build({ hasData: true })).rejects.toThrow('Could not generate an ES|QL query');
      expect(mockResolveTemplate).not.toHaveBeenCalled();
    });
  });

  describe('an edit of a panel with data', () => {
    const existing = { esqlQuery: STORED, template: OLD_TEMPLATE };

    it('keeps the stored query by default and refines the template without sampling', async () => {
      const result = await build({ nlQuery: 'Make it blue', existing });

      expect(mockGenerate).not.toHaveBeenCalled();
      expect(mockResolveTemplate).toHaveBeenCalledWith({
        prompt: 'Make it blue',
        esqlQuery: undefined,
        existingTemplate: OLD_TEMPLATE,
        hasExistingQuery: true,
      });
      expect(result.esqlQuery).toBe(STORED);
    });

    it('keeps the stored query when hasData is true', async () => {
      const result = await build({ existing, hasData: true });

      expect(mockGenerate).not.toHaveBeenCalled();
      expect(result.esqlQuery).toBe(STORED);
    });

    it('replaces the stored query with a supplied one and samples it', async () => {
      const result = await build({ existing, esql: EXPLICIT });

      expect(result.esqlQuery).toBe(EXPLICIT);
      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQuery: EXPLICIT, hasExistingQuery: false })
      );
    });

    it('does not report a change when the supplied query equals the stored one', async () => {
      await build({ existing, esql: STORED });

      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQuery: undefined, hasExistingQuery: true })
      );
    });

    it('keeps the stored query when the supplied query is blank', async () => {
      expect((await build({ existing, esql: '' })).esqlQuery).toBe(STORED);
    });

    it('removes the query when hasData is false or esql is null', async () => {
      expect((await build({ existing, hasData: false })).esqlQuery).toBeUndefined();
      expect((await build({ existing, esql: null })).esqlQuery).toBeUndefined();
    });

    it('lets a supplied query win over hasData: false', async () => {
      expect((await build({ existing, esql: EXPLICIT, hasData: false })).esqlQuery).toBe(EXPLICIT);
    });

    it('regenerates from the stored query when asked to', async () => {
      const result = await build({ existing, regenerateESQL: true });

      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ existingQueries: [STORED] })
      );
      expect(result.esqlQuery).toBe(GENERATED);
    });

    it('lets a supplied query or hasData: false win over regenerating', async () => {
      expect((await build({ existing, esql: EXPLICIT, regenerateESQL: true })).esqlQuery).toBe(
        EXPLICIT
      );
      expect((await build({ existing, hasData: false, regenerateESQL: true })).esqlQuery).toBe(
        undefined
      );
      expect(mockGenerate).not.toHaveBeenCalled();
    });
  });

  describe('an edit of a panel without data', () => {
    const existing = { template: OLD_TEMPLATE };

    it('stays data-free by default', async () => {
      const result = await build({ existing });

      expect(mockGenerate).not.toHaveBeenCalled();
      expect(result.esqlQuery).toBeUndefined();
    });

    it('generates a query when hasData is true or when asked to regenerate', async () => {
      expect((await build({ existing, hasData: true })).esqlQuery).toBe(GENERATED);
      expect((await build({ existing, regenerateESQL: true })).esqlQuery).toBe(GENERATED);
      expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({ existingQueries: [] }));
    });
  });

  describe('the template', () => {
    it('is kept, without a model call, when an edit has no prompt and keeps the query', async () => {
      const result = await buildCustomContentConfig({
        ...deps,
        existing: { esqlQuery: STORED, template: OLD_TEMPLATE },
      });

      expect(mockResolveTemplate).not.toHaveBeenCalled();
      expect(result).toEqual({ esqlQuery: STORED, template: OLD_TEMPLATE });
    });

    it('is written again, with an empty prompt, when an edit only changes the query', async () => {
      const result = await buildCustomContentConfig({
        ...deps,
        esql: EXPLICIT,
        existing: { esqlQuery: STORED, template: OLD_TEMPLATE },
      });

      expect(mockResolveTemplate).toHaveBeenCalledWith({
        prompt: '',
        esqlQuery: EXPLICIT,
        existingTemplate: OLD_TEMPLATE,
        hasExistingQuery: false,
      });
      expect(result.template).toBe('<div>resolved</div>');
    });

    it('is written again when an edit removes the query', async () => {
      await buildCustomContentConfig({
        ...deps,
        hasData: false,
        existing: { esqlQuery: STORED, template: OLD_TEMPLATE },
      });

      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: '', esqlQuery: undefined })
      );
    });

    it('fails the build when the template cannot be written', async () => {
      mockResolveTemplate.mockRejectedValue(new Error('Generated template was rejected'));

      await expect(build({ hasData: false })).rejects.toThrow('Generated template was rejected');
    });
  });
  describe('control values', () => {
    const esqlVariables = [{ key: 'host', value: 'web-1', type: ESQLVariableType.VALUES }];
    const hostQuery = 'FROM logs | WHERE host.name == ?host | STATS n = COUNT(*)';
    const resolveEsqlVariables = jest.fn();

    beforeEach(() => {
      resolveEsqlVariables.mockReset();
      resolveEsqlVariables.mockResolvedValue(esqlVariables);
    });

    it('asks for those the supplied query of a new panel uses, to sample it', async () => {
      await build({ esql: hostQuery, hasData: true, resolveEsqlVariables });

      expect(resolveEsqlVariables).toHaveBeenLastCalledWith([hostQuery], undefined);
      expect(mockResolveTemplate).toHaveBeenCalledWith(expect.objectContaining({ esqlVariables }));
    });

    it('asks for any variable before generating, and for those the generated query uses', async () => {
      mockGenerate.mockResolvedValue(hostQuery);

      await build({ hasData: true, resolveEsqlVariables });

      expect(resolveEsqlVariables).toHaveBeenNthCalledWith(1, [], { anyVariable: true });
      expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({ esqlVariables }));
      expect(resolveEsqlVariables).toHaveBeenLastCalledWith([hostQuery], undefined);
      expect(mockResolveTemplate).toHaveBeenCalledWith(expect.objectContaining({ esqlVariables }));
    });

    it('includes the stored query when regenerating', async () => {
      const stored = 'FROM logs | WHERE host.name == ?host | STATS hits = COUNT(*)';

      await build({
        regenerateESQL: true,
        resolveEsqlVariables,
        existing: { esqlQuery: stored, template: OLD_TEMPLATE },
      });

      expect(resolveEsqlVariables).toHaveBeenNthCalledWith(1, [stored], { anyVariable: true });
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ existingQueries: [stored], esqlVariables })
      );
    });

    it('asks for nothing when no query runs: a data-free panel, or an edit that keeps its query', async () => {
      await build({ hasData: false, resolveEsqlVariables });
      await build({
        resolveEsqlVariables,
        existing: { esqlQuery: hostQuery, template: OLD_TEMPLATE },
      });

      expect(resolveEsqlVariables).not.toHaveBeenCalled();
      for (const [call] of mockResolveTemplate.mock.calls) {
        expect(call.esqlVariables).toBeUndefined();
      }
    });

    it('sends none when there is no resolver', async () => {
      await build({ hasData: true });

      expect(mockGenerate.mock.calls[0][0].esqlVariables).toBeUndefined();
      expect(mockResolveTemplate.mock.calls[0][0].esqlVariables).toBeUndefined();
    });
  });
});
