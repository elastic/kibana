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
        esqlQueries: [GENERATED],
        isQueryChanging: true,
        existingTemplate: undefined,
      });
      expect(result).toEqual({
        esqlQueries: [GENERATED],
        template: '<div>resolved</div>',
        height: 320,
      });
    });

    it('uses a supplied query without generating', async () => {
      const result = await build({ esql: EXPLICIT, hasData: true });

      expect(mockGenerate).not.toHaveBeenCalled();
      expect(result.esqlQueries[0]).toBe(EXPLICIT);
    });

    it('creates a data-free panel when hasData is false', async () => {
      const result = await build({ hasData: false });

      expect(mockGenerate).not.toHaveBeenCalled();
      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'Show KPI', esqlQueries: [] })
      );
      expect(result.esqlQueries[0]).toBeUndefined();
    });

    it('lets a supplied query win over hasData: false', async () => {
      expect((await build({ esql: EXPLICIT, hasData: false })).esqlQueries[0]).toBe(EXPLICIT);
    });

    it('treats a blank supplied query as not supplied', async () => {
      const result = await build({ esql: '  ', hasData: true });

      expect(mockGenerate).toHaveBeenCalledTimes(1);
      expect(result.esqlQueries[0]).toBe(GENERATED);
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
    const existing = { esqlQueries: [STORED], template: OLD_TEMPLATE };

    it('keeps the stored query by default and refines the template without sampling', async () => {
      const result = await build({ nlQuery: 'Make it blue', existing });

      expect(mockGenerate).not.toHaveBeenCalled();
      expect(mockResolveTemplate).toHaveBeenCalledWith({
        prompt: 'Make it blue',
        esqlQueries: [STORED],
        isQueryChanging: false,
        existingTemplate: OLD_TEMPLATE,
      });
      expect(result.esqlQueries[0]).toBe(STORED);
    });

    it('keeps the stored query when hasData is true', async () => {
      const result = await build({ existing, hasData: true });

      expect(mockGenerate).not.toHaveBeenCalled();
      expect(result.esqlQueries[0]).toBe(STORED);
    });

    it('replaces the stored query with a supplied one and samples it', async () => {
      const result = await build({ existing, esql: EXPLICIT });

      expect(result.esqlQueries[0]).toBe(EXPLICIT);
      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQueries: [EXPLICIT], isQueryChanging: true })
      );
    });

    it('does not report a change when the supplied query equals the stored one', async () => {
      await build({ existing, esql: STORED });

      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQueries: [STORED], isQueryChanging: false })
      );
    });

    it('keeps the stored query when the supplied query is blank', async () => {
      expect((await build({ existing, esql: '' })).esqlQueries[0]).toBe(STORED);
    });

    it('removes the query when hasData is false or esql is null', async () => {
      expect((await build({ existing, hasData: false })).esqlQueries[0]).toBeUndefined();
      expect((await build({ existing, esql: null })).esqlQueries[0]).toBeUndefined();
    });

    it('lets a supplied query win over hasData: false', async () => {
      expect((await build({ existing, esql: EXPLICIT, hasData: false })).esqlQueries[0]).toBe(
        EXPLICIT
      );
    });

    it('regenerates from the stored query when asked to', async () => {
      const result = await build({ existing, regenerateESQL: true });

      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ existingQueries: [STORED] })
      );
      expect(result.esqlQueries[0]).toBe(GENERATED);
    });

    it('lets a supplied query or hasData: false win over regenerating', async () => {
      expect((await build({ existing, esql: EXPLICIT, regenerateESQL: true })).esqlQueries[0]).toBe(
        EXPLICIT
      );
      expect((await build({ existing, hasData: false, regenerateESQL: true })).esqlQueries[0]).toBe(
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
      expect(result.esqlQueries[0]).toBeUndefined();
    });

    it('generates a query when hasData is true or when asked to regenerate', async () => {
      expect((await build({ existing, hasData: true })).esqlQueries[0]).toBe(GENERATED);
      expect((await build({ existing, regenerateESQL: true })).esqlQueries[0]).toBe(GENERATED);
      expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({ existingQueries: [] }));
    });
  });

  describe('the template', () => {
    it('is kept, without a model call, when an edit has no prompt and keeps the query', async () => {
      const result = await buildCustomContentConfig({
        ...deps,
        existing: { esqlQueries: [STORED], template: OLD_TEMPLATE },
      });

      expect(mockResolveTemplate).not.toHaveBeenCalled();
      expect(result).toEqual({ esqlQueries: [STORED], template: OLD_TEMPLATE });
    });

    it('is written again, with an empty prompt, when an edit only changes the query', async () => {
      const result = await buildCustomContentConfig({
        ...deps,
        esql: EXPLICIT,
        existing: { esqlQueries: [STORED], template: OLD_TEMPLATE },
      });

      expect(mockResolveTemplate).toHaveBeenCalledWith({
        prompt: '',
        esqlQueries: [EXPLICIT],
        isQueryChanging: true,
        existingTemplate: OLD_TEMPLATE,
      });
      expect(result.template).toBe('<div>resolved</div>');
    });

    it('is written again when an edit removes the query', async () => {
      await buildCustomContentConfig({
        ...deps,
        hasData: false,
        existing: { esqlQueries: [STORED], template: OLD_TEMPLATE },
      });

      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: '', esqlQueries: [], isQueryChanging: true })
      );
    });

    it('fails the build when the template cannot be written', async () => {
      mockResolveTemplate.mockRejectedValue(new Error('Generated template was rejected'));

      await expect(build({ hasData: false })).rejects.toThrow('Generated template was rejected');
    });
  });
  describe('additional queries', () => {
    const existing = {
      esqlQueries: [STORED, 'FROM metrics', 'FROM traces'],
      template: OLD_TEMPLATE,
    };

    it('keeps them through an edit, and gives them to the template resolver with the main query', async () => {
      const result = await build({ nlQuery: 'Make it blue', existing });

      expect(result.esqlQueries).toEqual([STORED, 'FROM metrics', 'FROM traces']);
      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          esqlQueries: [STORED, 'FROM metrics', 'FROM traces'],
          isQueryChanging: false,
        })
      );
    });

    it('keeps them, and the template, when an edit has no prompt and keeps the query', async () => {
      const result = await buildCustomContentConfig({ ...deps, existing });

      expect(mockResolveTemplate).not.toHaveBeenCalled();
      expect(result).toEqual({
        esqlQueries: [STORED, 'FROM metrics', 'FROM traces'],
        template: OLD_TEMPLATE,
      });
    });

    it('keeps them after the main query when it is replaced or regenerated', async () => {
      const replaced = await build({ esql: EXPLICIT, existing });
      const regenerated = await build({ regenerateESQL: true, existing });

      expect(replaced.esqlQueries).toEqual([EXPLICIT, 'FROM metrics', 'FROM traces']);
      expect(regenerated.esqlQueries).toEqual([GENERATED, 'FROM metrics', 'FROM traces']);
    });

    it('drops them, and does not pass them on, when the main query is removed', async () => {
      const result = await build({ esql: null, existing });

      expect(result.esqlQueries).toEqual([]);
      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQueries: [] })
      );
    });

    it('does not give a new panel any', async () => {
      const result = await build({ hasData: true });

      expect(result.esqlQueries).toEqual([GENERATED]);
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
        existing: { esqlQueries: [stored], template: OLD_TEMPLATE },
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
        existing: { esqlQueries: [hostQuery], template: OLD_TEMPLATE },
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
