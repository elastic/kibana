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
        'set(log.attributes["level"], ToUpperCase(log.attributes["level"])) where (log.attributes["level"] != nil) and (IsString(log.attributes["level"]))',
      ]);
    });

    it('writes to a different target when `to` is given', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'uppercase', from: 'level', to: 'level_upper' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["level_upper"], ToUpperCase(log.attributes["level"])) where (log.attributes["level"] != nil) and (IsString(log.attributes["level"]))',
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
        'merge_maps(log.attributes, ExtractGrokPatterns(log.attributes["message"], "%{IP:client.ip} %{NUMBER:bytes}", true), "upsert") where (log.attributes["message"] != nil)',
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

    it('forwards pattern_definitions as the 4th ExtractGrokPatterns argument', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{GREETING:greeting} world'],
            pattern_definitions: {
              GREETING: 'hello|hi|hey',
            },
          },
        ],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'merge_maps(log.attributes, ExtractGrokPatterns(log.attributes["message"], "%{GREETING:greeting} world", true, ["GREETING=hello|hi|hey"]), "upsert") where (log.attributes["message"] != nil)',
      ]);
      expect(result.warnings).toEqual([]);
    });

    it('passes @timestamp field name in pattern_definitions without RE2 named-capture inlining, and emits a warning', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{MY_TS:@timestamp} %{WORD:level}'],
            pattern_definitions: {
              MY_TS: '\\d{4}-\\d{2}-\\d{2}',
            },
          },
        ],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'merge_maps(log.attributes, ExtractGrokPatterns(log.attributes["message"], "%{MY_TS:@timestamp} %{WORD:level}", true, ["MY_TS=\\\\d{4}-\\\\d{2}-\\\\d{2}"]), "upsert") where (log.attributes["message"] != nil)',
      ]);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/@timestamp/);
      expect(result.warnings[0]).toMatch(/not be extracted/);
    });

    it('passes dotted field name in pattern_definitions without RE2 named-capture inlining', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{MY_IP:client.ip}'],
            pattern_definitions: {
              MY_IP: '\\d+\\.\\d+\\.\\d+\\.\\d+',
            },
          },
        ],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'merge_maps(log.attributes, ExtractGrokPatterns(log.attributes["message"], "%{MY_IP:client.ip}", true, ["MY_IP=\\\\d+\\\\.\\\\d+\\\\.\\\\d+\\\\.\\\\d+"]), "upsert") where (log.attributes["message"] != nil)',
      ]);
      expect(result.warnings).toEqual([]);
    });

    it('emits a warning when pattern_definitions are cyclic', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{A:result}'],
            pattern_definitions: {
              A: '%{B}',
              B: '%{A}',
            },
          },
        ],
      };
      const result = await transpile(dsl);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/cyclic/);
      expect(result.warnings[0]).toMatch(/A|B/);
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
      expect(asFilter(result.processors['filter/streamlang']).log_conditions).toEqual([
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
          '    log_conditions:',
          '      - "log.attributes[\\"level\\"] == \\"debug\\""',
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
    it('throws a descriptive error for unsupported actions', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'a', value: 1 },
          { action: 'math', expression: 'a + 1', to: 'b' },
        ],
      };
      await expect(transpile(dsl)).rejects.toThrow(/math/);
      await expect(transpile(dsl)).rejects.toThrow(/cannot be transpiled/);
    });

    it('includes the reason in the error message', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'enrich', policy_name: 'my-policy', to: 'enriched' }],
      };
      await expect(transpile(dsl)).rejects.toThrow(/enrich/);
      await expect(transpile(dsl)).rejects.toThrow(/lookup/);
    });
  });

  describe('lowercase processor', () => {
    it('transforms in place when no target is given', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'lowercase', from: 'level' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["level"], ToLowerCase(log.attributes["level"])) where (log.attributes["level"] != nil) and (IsString(log.attributes["level"]))',
      ]);
    });

    it('writes to a different target when `to` is given', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'lowercase', from: 'level', to: 'level_lower' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["level_lower"], ToLowerCase(log.attributes["level"])) where (log.attributes["level"] != nil) and (IsString(log.attributes["level"]))',
      ]);
    });

    it('drops the nil guard when ignore_missing is true', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'lowercase', from: 'level', ignore_missing: true }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["level"], ToLowerCase(log.attributes["level"])) where (IsString(log.attributes["level"]))',
      ]);
    });
  });

  describe('trim processor', () => {
    it('trims whitespace in place', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'trim', from: 'message' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["message"], TrimSpace(log.attributes["message"])) where (log.attributes["message"] != nil) and (IsString(log.attributes["message"]))',
      ]);
    });

    it('writes trimmed value to a target field', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'trim', from: 'message', to: 'message_trimmed' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["message_trimmed"], TrimSpace(log.attributes["message"])) where (log.attributes["message"] != nil) and (IsString(log.attributes["message"]))',
      ]);
    });
  });

  describe('replace processor', () => {
    it('emits replace_pattern in place when no to is given', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'replace', from: 'message', pattern: 'foo', replacement: 'bar' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'replace_pattern(log.attributes["message"], "foo", "bar") where (log.attributes["message"] != nil)',
      ]);
    });

    it('emits copy+replace when a different target is specified', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'replace', from: 'message', pattern: 'foo', replacement: 'bar', to: 'cleaned' },
        ],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["cleaned"], log.attributes["message"]) where (log.attributes["message"] != nil)',
        'replace_pattern(log.attributes["cleaned"], "foo", "bar") where (log.attributes["message"] != nil)',
      ]);
    });

    it('drops the nil guard when ignore_missing is true', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'replace', from: 'message', pattern: 'foo', replacement: 'bar', ignore_missing: true },
        ],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'replace_pattern(log.attributes["message"], "foo", "bar")',
      ]);
    });
  });

  describe('split processor', () => {
    it('splits a field in place', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'split', from: 'tags', separator: ',' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["tags"], Split(log.attributes["tags"], ",")) where (log.attributes["tags"] != nil)',
      ]);
    });

    it('splits into a target field', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'split', from: 'tags', separator: ',', to: 'tag_list' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["tag_list"], Split(log.attributes["tags"], ",")) where (log.attributes["tags"] != nil)',
      ]);
    });
  });

  describe('convert processor', () => {
    it('converts to integer via Int()', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'convert', from: 'count', type: 'integer' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["count"], Int(log.attributes["count"])) where (log.attributes["count"] != nil)',
      ]);
    });

    it('maps long to Int() (OTTL has no ToLong)', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'convert', from: 'count', type: 'long' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["count"], Int(log.attributes["count"])) where (log.attributes["count"] != nil)',
      ]);
    });

    it('converts to double via Double()', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'convert', from: 'score', type: 'double' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["score"], Double(log.attributes["score"])) where (log.attributes["score"] != nil)',
      ]);
    });

    it('converts to string via String()', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'convert', from: 'code', type: 'string' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["code"], String(log.attributes["code"])) where (log.attributes["code"] != nil)',
      ]);
    });

    it('converts to boolean via Bool()', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'convert', from: 'active', type: 'boolean' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["active"], Bool(log.attributes["active"])) where (log.attributes["active"] != nil)',
      ]);
    });

    it('writes to a target field when to is specified', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'convert', from: 'count', type: 'integer', to: 'count_int' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["count_int"], Int(log.attributes["count"])) where (log.attributes["count"] != nil)',
      ]);
    });
  });

  describe('redact processor', () => {
    it('emits replace_pattern for each compiled grok pattern', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'redact', from: 'message', patterns: ['%{IP:client}'] }],
      };
      const result = await transpile(dsl);
      const statements = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(statements).toHaveLength(1);
      expect(statements[0]).toMatch(/^replace_pattern\(log\.attributes\["message"\]/);
      expect(statements[0]).toMatch(/"<client>"/);
    });

    it('uses custom prefix and suffix', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'redact', from: 'message', patterns: ['%{IP:client}'], prefix: '[', suffix: ']' },
        ],
      };
      const result = await transpile(dsl);
      const statements = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(statements[0]).toMatch(/"\[client\]"/);
    });

    it('emits one statement per pattern', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{IP:client}', '%{EMAILADDRESS:email}'],
          },
        ],
      };
      const result = await transpile(dsl);
      const statements = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(statements).toHaveLength(2);
    });

    it('adds a nil guard when ignore_missing is false', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'redact', from: 'message', patterns: ['%{IP:client}'], ignore_missing: false }],
      };
      const result = await transpile(dsl);
      const statements = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(statements[0]).toContain('where (log.attributes["message"] != nil)');
    });
  });

  describe('concat processor', () => {
    it('concatenates fields and literals into a target', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'concat',
            from: [
              { type: 'field', value: 'first_name' },
              { type: 'literal', value: ' ' },
              { type: 'field', value: 'last_name' },
            ],
            to: 'full_name',
          },
        ],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["full_name"], Concat([log.attributes["first_name"], " ", log.attributes["last_name"]], "")) where (log.attributes["first_name"] != nil) and (log.attributes["last_name"] != nil)',
      ]);
    });

    it('drops nil guards when ignore_missing is true', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'concat',
            from: [{ type: 'field', value: 'a' }, { type: 'field', value: 'b' }],
            to: 'ab',
            ignore_missing: true,
          },
        ],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["ab"], Concat([log.attributes["a"], log.attributes["b"]], ""))',
      ]);
    });
  });

  describe('error_mode option', () => {
    it('passes propagate to all emitted processors', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'status', value: 'ok' },
          { action: 'drop_document', where: { field: 'level', eq: 'debug' } },
        ],
      };
      const result = await transpile(dsl, { errorMode: 'propagate' });
      expect(
        asTransform(result.processors['transform/streamlang']).error_mode
      ).toBe('propagate');
      expect(
        asFilter(result.processors['filter/streamlang']).error_mode
      ).toBe('propagate');
    });

    it('defaults to ignore when no option is given', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'set', to: 'status', value: 'ok' }],
      };
      const result = await transpile(dsl);
      expect(
        asTransform(result.processors['transform/streamlang']).error_mode
      ).toBe('ignore');
    });
  });
});
