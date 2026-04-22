/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transpile } from '.';
import type { StreamlangDSL } from '../../../types/streamlang';
import type { OtelFilterProcessorConfig, OtelTransformProcessorConfig } from './types';

const asTransform = (config: unknown): OtelTransformProcessorConfig =>
  config as OtelTransformProcessorConfig;
const asFilter = (config: unknown): OtelFilterProcessorConfig =>
  config as OtelFilterProcessorConfig;

describe('transpileOtelCollector', () => {
  describe('set processor', () => {
    it('emits a literal assignment', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'set', to: 'status', value: 'ok' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["status"], "ok")',
      ]);
      expect(result.pipelineProcessors).toEqual(['transform/streamlang']);
      expect(result.warnings).toEqual([]);
    });

    it('emits a copy_from assignment', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'set', to: 'host.name', copy_from: 'hostname' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["host.name"], log.attributes["hostname"])',
      ]);
    });

    it('adds an override guard to the where clause when override is false', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'set', to: 'status', value: 'ok', override: false }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["status"], "ok") where (log.attributes["status"] == nil)',
      ]);
    });

    it('combines an inline where with the override guard', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'status',
            value: 'ok',
            override: false,
            where: { field: 'severity', eq: 'error' },
          },
        ],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["status"], "ok") where (log.attributes["severity"] == "error") and (log.attributes["status"] == nil)',
      ]);
    });
  });

  describe('rename processor', () => {
    it('emits a copy + delete pair with presence + override guards', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'rename', from: 'old_field', to: 'new_field' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["new_field"], log.attributes["old_field"]) where (log.attributes["old_field"] != nil) and (log.attributes["new_field"] == nil)',
        'delete_key(log.attributes, "old_field") where (log.attributes["old_field"] != nil) and (log.attributes["new_field"] == nil)',
      ]);
    });
  });

  describe('remove processor', () => {
    it('emits delete_key with a presence guard by default', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'remove', from: 'temp' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'delete_key(log.attributes, "temp") where (log.attributes["temp"] != nil)',
      ]);
    });

    it('drops the presence guard when ignore_missing is true', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'remove', from: 'temp', ignore_missing: true }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'delete_key(log.attributes, "temp")',
      ]);
    });
  });

  describe('uppercase processor', () => {
    it('transforms in place when no target is given', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'uppercase', from: 'level' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["level"], ToUpperCase(log.attributes["level"])) where (log.attributes["level"] != nil)',
      ]);
    });

    it('writes to a different target when `to` is given', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'uppercase', from: 'level', to: 'level_upper' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["level_upper"], ToUpperCase(log.attributes["level"])) where (log.attributes["level"] != nil)',
      ]);
    });
  });

  describe('grok processor', () => {
    it('emits ExtractGrokPatterns merged into attributes', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:client.ip} %{NUMBER:bytes}'],
          },
        ],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes, merge_maps(log.attributes, ExtractGrokPatterns(log.attributes["message"], "%{IP:client.ip} %{NUMBER:bytes}", true), "upsert")) where (log.attributes["message"] != nil)',
      ]);
    });

    it('warns when multiple patterns are provided', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:ip}', '%{WORD:word}'],
          },
        ],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('2 patterns');
    });
  });

  describe('drop_document processor', () => {
    it('emits a filter processor with the where condition', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'drop_document',
            where: { field: 'level', eq: 'debug' },
          },
        ],
      };
      const result = await transpile(dsl);
      expect(asFilter(result.processors['filter/streamlang']).logs.log_record).toEqual([
        'log.attributes["level"] == "debug"',
      ]);
      expect(result.pipelineProcessors).toEqual(['filter/streamlang']);
    });
  });

  describe('ordering + grouping', () => {
    it('splits the pipeline when transform/filter/transform interleave', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'a', value: 1 },
          { action: 'drop_document', where: { field: 'skip', eq: true } },
          { action: 'set', to: 'b', value: 2 },
        ],
      };
      const result = await transpile(dsl);
      expect(result.pipelineProcessors).toEqual([
        'transform/streamlang',
        'filter/streamlang',
        'transform/streamlang_2',
      ]);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["a"], 1)',
      ]);
      expect(asTransform(result.processors['transform/streamlang_2']).log_statements).toEqual([
        'set(log.attributes["b"], 2)',
      ]);
    });

    it('merges contiguous transform emissions into one processor', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'a', value: 1 },
          { action: 'set', to: 'b', value: 2 },
          { action: 'remove', from: 'c', ignore_missing: true },
        ],
      };
      const result = await transpile(dsl);
      expect(result.pipelineProcessors).toEqual(['transform/streamlang']);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["a"], 1)',
        'set(log.attributes["b"], 2)',
        'delete_key(log.attributes, "c")',
      ]);
    });
  });

  describe('where-block flattening', () => {
    it('ANDs parent where block conditions into each inner statement', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            condition: {
              field: 'type',
              eq: 'log',
              steps: [
                { action: 'set', to: 'status', value: 'ok' },
                { action: 'remove', from: 'noise', ignore_missing: true },
              ],
            },
          },
        ],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["status"], "ok") where (log.attributes["type"] == "log")',
        'delete_key(log.attributes, "noise") where (log.attributes["type"] == "log")',
      ]);
    });

    it('negates parent conditions for else branches', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            condition: {
              field: 'severity',
              eq: 'error',
              steps: [{ action: 'set', to: 'route', value: 'errors' }],
              else: [{ action: 'set', to: 'route', value: 'default' }],
            },
          },
        ],
      };
      const result = await transpile(dsl);
      const statements = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(statements[0]).toBe(
        'set(log.attributes["route"], "errors") where (log.attributes["severity"] == "error")'
      );
      expect(statements[1]).toBe(
        'set(log.attributes["route"], "default") where (not (log.attributes["severity"] == "error"))'
      );
    });
  });

  describe('yaml output', () => {
    it('renders a complete collector fragment with a logs pipeline', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'status', value: 'ok' },
          { action: 'drop_document', where: { field: 'level', eq: 'debug' } },
        ],
      };
      const result = await transpile(dsl);
      expect(result.yaml).toBe(
        [
          'processors:',
          '  "transform/streamlang":',
          '    error_mode: ignore',
          '    log_statements:',
          '      - "set(log.attributes[\\"status\\"], \\"ok\\")"',
          '  "filter/streamlang":',
          '    error_mode: ignore',
          '    logs:',
          '      log_record:',
          '        - "log.attributes[\\"level\\"] == \\"debug\\""',
          'service:',
          '  pipelines:',
          '    logs:',
          '      processors:',
          '        - "transform/streamlang"',
          '        - "filter/streamlang"',
          '',
        ].join('\n')
      );
    });
  });

  describe('unsupported actions', () => {
    it('does not throw and records a warning for unsupported actions', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'a', value: 1 },
          { action: 'math', expression: 'a + 1', to: 'b' },
        ],
      };
      const result = await transpile(dsl);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('math');
    });
  });
});
