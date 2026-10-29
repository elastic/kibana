/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateGeneratedYaml } from './validate';

describe('validateGeneratedYaml', () => {
  it('returns valid + parsedWorkflow when api succeeds', async () => {
    const api = {
      validateWorkflow: jest.fn().mockResolvedValue({
        valid: true,
        diagnostics: [],
        parsedWorkflow: { name: 'foo', version: '1', triggers: [{ type: 'manual' }], steps: [] },
      }),
    } as any;

    const result = await validateGeneratedYaml('yaml', {
      api,
      spaceId: 'default',
      request: {} as any,
    });
    expect(result.valid).toBe(true);
    expect(result.parsedWorkflow).toBeDefined();
    expect(result.errors).toEqual([]);
  });

  it('returns compacted error strings when invalid', async () => {
    const api = {
      validateWorkflow: jest.fn().mockResolvedValue({
        valid: false,
        diagnostics: [
          { severity: 'error', source: 'schema', message: 'missing field', path: ['steps', 0] },
          { severity: 'warning', source: 'lint', message: 'odd' },
        ],
      }),
    } as any;

    const result = await validateGeneratedYaml('y', {
      api,
      spaceId: 'default',
      request: {} as any,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(['[schema] missing field (at steps.0)']);
  });

  describe('unknown ES|QL sources', () => {
    const parsedWorkflow = { name: 'foo', version: '1', triggers: [{ type: 'manual' }], steps: [] };
    const unknownSource = {
      severity: 'error',
      source: 'esql',
      ruleId: 'esqlUnknownSource',
      message: 'ES|QL: Unknown data source "events-archive" (line 9, column 14)',
      path: ['steps', 0, 'with', 'query'],
    };

    it('accepts a workflow whose only errors are unknown sources', async () => {
      const api = {
        validateWorkflow: jest
          .fn()
          .mockResolvedValue({ valid: false, diagnostics: [unknownSource], parsedWorkflow }),
      } as any;

      const result = await validateGeneratedYaml('y', {
        api,
        spaceId: 'default',
        request: {} as any,
      });
      expect(result).toEqual({
        valid: true,
        parsedWorkflow,
        errors: [],
        unknownSources: [
          '[esql] ES|QL: Unknown data source "events-archive" (line 9, column 14) (at steps.0.with.query)',
        ],
      });
    });

    it('stays invalid when another error remains, and reports only that error', async () => {
      const api = {
        validateWorkflow: jest.fn().mockResolvedValue({
          valid: false,
          diagnostics: [
            unknownSource,
            { severity: 'error', source: 'esql', ruleId: 'esqlDiagnostic', message: 'ES|QL: x' },
          ],
          parsedWorkflow,
        }),
      } as any;

      const result = await validateGeneratedYaml('y', {
        api,
        spaceId: 'default',
        request: {} as any,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['[esql] ES|QL: x']);
      expect(result.unknownSources).toEqual([]);
    });
  });
});
