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
    it('emits a copy + delete pair; set uses override guard, delete does not', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'rename', from: 'old_field', to: 'new_field' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["new_field"], log.attributes["old_field"]) where (log.attributes["old_field"] != nil) and (log.attributes["new_field"] == nil)',
        // delete uses only the source-presence guard — not the override guard —
        // so the delete fires after set() populates the target field.
        'delete_key(log.attributes, "old_field") where (log.attributes["old_field"] != nil)',
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
        'set(log.attributes["message"], Trim(log.attributes["message"], " ")) where (log.attributes["message"] != nil) and (IsString(log.attributes["message"]))',
      ]);
    });

    it('writes trimmed value to a target field', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'trim', from: 'message', to: 'message_trimmed' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["message_trimmed"], Trim(log.attributes["message"], " ")) where (log.attributes["message"] != nil) and (IsString(log.attributes["message"]))',
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
          {
            action: 'replace',
            from: 'message',
            pattern: 'foo',
            replacement: 'bar',
            ignore_missing: true,
          },
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
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{IP:client}'],
            prefix: '[',
            suffix: ']',
          },
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
        steps: [
          { action: 'redact', from: 'message', patterns: ['%{IP:client}'], ignore_missing: false },
        ],
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
            from: [
              { type: 'field', value: 'a' },
              { type: 'field', value: 'b' },
            ],
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

  describe('append processor', () => {
    it('emits one append statement per value', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'append', to: 'tags', value: ['a', 'b'] }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'append(log.attributes["tags"], "a")',
        'append(log.attributes["tags"], "b")',
      ]);
    });

    it('creates an array when the target does not exist', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'append', to: 'new_tags', value: [42] }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'append(log.attributes["new_tags"], 42)',
      ]);
    });

    it('adds IsMatch dedup guards when allow_duplicates is false', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'append', to: 'tags', value: ['x'], allow_duplicates: false }],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).toContain('IsMatch');
      expect(stmts[0]).toContain('"x"');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('allow_duplicates');
    });
  });

  describe('json_extract processor', () => {
    it('emits ParseJSON + field extractions + cleanup', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'payload',
            extractions: [{ selector: 'user_id', target_field: 'uid' }],
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).toBe(
        'set(log.attributes["__sl_p"], ParseJSON(log.attributes["payload"])) where (log.attributes["payload"] != nil)'
      );
      expect(stmts[1]).toBe(
        'set(log.attributes["uid"], log.attributes["__sl_p"]["user_id"]) where (log.attributes["__sl_p"] != nil)'
      );
      expect(stmts[2]).toContain('delete_key');
      expect(stmts[2]).toContain('__sl_p');
    });

    it('handles dotted selectors as nested access', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'payload',
            extractions: [{ selector: 'user.name', target_field: 'username' }],
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[1]).toContain('["user"]["name"]');
    });

    it('handles array index selectors', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'payload',
            extractions: [{ selector: 'items[0]', target_field: 'first' }],
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[1]).toContain('["items"][0]');
    });

    it('wraps extraction with type converter when type is specified', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'payload',
            extractions: [{ selector: 'count', target_field: 'count_int', type: 'integer' }],
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[1]).toContain('Int(');
    });

    it('strips $. JSONPath prefix from selector', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'payload',
            extractions: [{ selector: '$.user.id', target_field: 'uid' }],
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[1]).toContain('["user"]["id"]');
    });
  });

  describe('date processor', () => {
    it('emits UnixNano(Time(...)) for a custom date format', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'date', from: 'timestamp_str', formats: ['yyyy-MM-dd'] }],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).toContain('UnixNano(Time(');
      expect(stmts[0]).toContain('"2006-01-02"');
      expect(stmts[0]).toContain('log.attributes["timestamp_str"]');
    });

    it('translates a named Elasticsearch format', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'date', from: 'ts', formats: ['strict_date_optional_time'] }],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).toContain('2006-01-02T15:04:05');
    });

    it('handles epoch_millis as multiplication rather than Time()', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'date', from: 'ts_ms', formats: ['epoch_millis'] }],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).toContain('Int(log.attributes["ts_ms"]) * 1000000');
      expect(stmts[0]).not.toContain('Time(');
    });

    it('handles epoch_second as multiplication', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'date', from: 'ts_s', formats: ['epoch_second'] }],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).toContain('Int(log.attributes["ts_s"]) * 1000000000');
    });

    it('writes to a target field when to is specified', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'date', from: 'raw_ts', to: 'parsed_ts', formats: ['yyyy-MM-dd'] }],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).toContain('log.attributes["parsed_ts"]');
    });

    it('appends timezone to the Time() call', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'ts',
            formats: ['yyyy-MM-dd HH:mm:ss'],
            timezone: 'America/New_York',
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).toContain('"America/New_York"');
    });

    it('tries formats in order via target == nil guard', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'date', from: 'ts', formats: ['yyyy-MM-dd HH:mm:ss', 'yyyy-MM-dd'] }],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts).toHaveLength(2);
      expect(stmts[0]).toContain('log.attributes["ts"] == nil');
      expect(stmts[1]).toContain('log.attributes["ts"] == nil');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('2 formats');
    });

    it('emits a warning when output_format is specified', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'ts',
            formats: ['yyyy-MM-dd'],
            output_format: 'dd/MM/yyyy',
          },
        ],
      };
      const result = await transpile(dsl);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('output_format');
    });
  });

  describe('join processor', () => {
    it('joins fields with a delimiter using Concat', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'join',
            from: ['first_name', 'last_name'],
            delimiter: ' ',
            to: 'full_name',
          },
        ],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["full_name"], Concat([log.attributes["first_name"], log.attributes["last_name"]], " ")) where (log.attributes["first_name"] != nil) and (log.attributes["last_name"] != nil)',
      ]);
    });

    it('drops nil guards when ignore_missing is true', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'join',
            from: ['a', 'b', 'c'],
            delimiter: '-',
            to: 'result',
            ignore_missing: true,
          },
        ],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).log_statements).toEqual([
        'set(log.attributes["result"], Concat([log.attributes["a"], log.attributes["b"], log.attributes["c"]], "-"))',
      ]);
    });

    it('passes a where condition through to the statement', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'join',
            from: ['host', 'path'],
            delimiter: '/',
            to: 'url',
            where: { field: 'enabled', eq: true },
          },
        ],
      };
      const result = await transpile(dsl);
      const stmt = asTransform(result.processors['transform/streamlang']).log_statements[0];
      expect(stmt).toContain('log.attributes["enabled"] == true');
      expect(stmt).toContain('Concat(');
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
      expect(asTransform(result.processors['transform/streamlang']).error_mode).toBe('propagate');
      expect(asFilter(result.processors['filter/streamlang']).error_mode).toBe('propagate');
    });

    it('defaults to ignore when no option is given', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'set', to: 'status', value: 'ok' }],
      };
      const result = await transpile(dsl);
      expect(asTransform(result.processors['transform/streamlang']).error_mode).toBe('ignore');
    });

    it('passes silent to all emitted processors', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'set', to: 'status', value: 'ok' },
          { action: 'drop_document', where: { field: 'level', eq: 'debug' } },
        ],
      };
      const result = await transpile(dsl, { errorMode: 'silent' });
      expect(asTransform(result.processors['transform/streamlang']).error_mode).toBe('silent');
      expect(asFilter(result.processors['filter/streamlang']).error_mode).toBe('silent');
    });
  });

  describe('grok processor additional edge cases', () => {
    it('includes the where condition in the statement', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:client.ip}'],
            where: { field: 'type', eq: 'access' },
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).toContain('log.attributes["type"] == "access"');
      expect(stmts[0]).toContain('ExtractGrokPatterns(');
    });

    it('drops the nil guard on the source field when ignore_missing is true', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'grok',
            from: 'message',
            patterns: ['%{IP:client.ip}'],
            ignore_missing: true,
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).not.toContain('where');
    });
  });

  describe('date processor additional edge cases', () => {
    it('emits a warning for non-English locale', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'date', from: 'ts', formats: ['yyyy-MM-dd'], locale: 'fr' }],
      };
      const result = await transpile(dsl);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('locale');
      expect(result.warnings[0]).toContain('fr');
    });

    it('does not emit a locale warning for en locale', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'date', from: 'ts', formats: ['yyyy-MM-dd'], locale: 'en' }],
      };
      const result = await transpile(dsl);
      expect(result.warnings).toEqual([]);
    });

    it('includes the where condition in the statement', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'date',
            from: 'ts',
            formats: ['yyyy-MM-dd'],
            where: { field: 'type', eq: 'log' },
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).toContain('log.attributes["type"] == "log"');
      expect(stmts[0]).toContain('UnixNano(Time(');
    });

    it('translates HH:mm:ss Java format tokens to Go layout', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'date', from: 'ts', formats: ['yyyy-MM-dd HH:mm:ss'] }],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).toContain('"2006-01-02 15:04:05"');
    });

    it('translates 12h hour and AM/PM tokens', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'date', from: 'ts', formats: ['hh:mm:ss a'] }],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).toContain('"03:04:05 PM"');
    });
  });

  describe('json_extract processor additional edge cases', () => {
    it('drops the nil guard on the source field when ignore_missing is true', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'payload',
            extractions: [{ selector: 'id', target_field: 'doc_id' }],
            ignore_missing: true,
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).not.toContain('where');
    });

    it('includes the where condition in the parse statement', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'payload',
            extractions: [{ selector: 'id', target_field: 'doc_id' }],
            where: { field: 'type', eq: 'json' },
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).toContain('log.attributes["type"] == "json"');
      expect(stmts[0]).toContain('ParseJSON(');
    });

    it('strips a bare $ prefix from the selector', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'json_extract',
            field: 'payload',
            extractions: [{ selector: '$name', target_field: 'doc_name' }],
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[1]).toContain('["name"]');
    });
  });

  describe('concat processor additional edge cases', () => {
    it('emits no where clause when all entries are literals', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'concat',
            from: [
              { type: 'literal', value: 'hello' },
              { type: 'literal', value: ' world' },
            ],
            to: 'greeting',
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).not.toContain('where');
      expect(stmts[0]).toContain('Concat(["hello", " world"], "")');
    });

    it('includes the where condition in the statement', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'concat',
            from: [
              { type: 'field', value: 'first' },
              { type: 'literal', value: '-' },
              { type: 'field', value: 'last' },
            ],
            to: 'name',
            where: { field: 'enabled', eq: true },
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).toContain('log.attributes["enabled"] == true');
      expect(stmts[0]).toContain('Concat(');
    });
  });

  describe('redact processor additional edge cases', () => {
    it('emits no nil guard when ignore_missing is true (default)', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'redact', from: 'message', patterns: ['%{IP:client}'] }],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).not.toContain('where');
    });

    it('uses custom pattern_definitions when compiling grok patterns', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{MY_SECRET:secret}'],
            pattern_definitions: { MY_SECRET: 'token-[a-z]+' },
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts).toHaveLength(1);
      expect(stmts[0]).toContain('<secret>');
      expect(stmts[0]).toContain('token-');
    });

    it('emits a warning when a pattern cannot be compiled', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{TOTALLY_UNKNOWN_PATTERN_XYZ:val}'],
          },
        ],
      };
      const result = await transpile(dsl);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('skipped');
    });
  });

  describe('replace processor additional edge cases', () => {
    it('emits a single replace_pattern when to equals from explicitly', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          { action: 'replace', from: 'message', to: 'message', pattern: 'foo', replacement: 'bar' },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts).toHaveLength(1);
      expect(stmts[0]).toContain('replace_pattern(log.attributes["message"]');
    });
  });

  describe('set processor additional edge cases', () => {
    it('handles dotted field names in copy_from', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'set', to: 'dest.field', copy_from: 'source.field' }],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts[0]).toContain('log.attributes["dest.field"]');
      expect(stmts[0]).toContain('log.attributes["source.field"]');
    });
  });

  describe('append processor additional edge cases', () => {
    it('passes the where condition through to each append statement', async () => {
      const dsl: StreamlangDSL = {
        steps: [
          {
            action: 'append',
            to: 'tags',
            value: ['a', 'b'],
            where: { field: 'enabled', eq: true },
          },
        ],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts).toHaveLength(2);
      expect(stmts[0]).toContain('log.attributes["enabled"] == true');
      expect(stmts[1]).toContain('log.attributes["enabled"] == true');
    });

    it('emits IsMatch dedup guards for each value when allow_duplicates is false', async () => {
      const dsl: StreamlangDSL = {
        steps: [{ action: 'append', to: 'tags', value: ['x', 'y'], allow_duplicates: false }],
      };
      const result = await transpile(dsl);
      const stmts = asTransform(result.processors['transform/streamlang']).log_statements;
      expect(stmts).toHaveLength(2);
      expect(stmts[0]).toContain('"x"');
      expect(stmts[1]).toContain('"y"');
      expect(stmts[0]).toContain('IsMatch');
      expect(stmts[1]).toContain('IsMatch');
    });
  });
});
