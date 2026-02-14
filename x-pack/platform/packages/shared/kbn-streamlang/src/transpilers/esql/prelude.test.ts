/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder } from '@kbn/esql-language';
import {
  generateInsistCommands,
  generateTypedEvalCasts,
  generatePrelude,
  type PreludeField,
} from './prelude';

describe('ESQL Prelude', () => {
  describe('generateInsistCommands', () => {
    it('generates INSIST_🐔 commands for each field', () => {
      const commands = generateInsistCommands(['field_a', 'field_b']);

      expect(commands).toHaveLength(2);
      expect(commands[0].name).toBe('insist_🐔');
      expect(commands[1].name).toBe('insist_🐔');
    });

    it('sorts fields alphabetically for deterministic output', () => {
      const commands = generateInsistCommands(['zebra', 'alpha', 'middle']);

      const query = Builder.expression.query(commands);
      const formatted = BasicPrettyPrinter.multiline(query, { pipeTab: '' });

      expect(formatted).toMatchInlineSnapshot(`
        "INSIST_🐔 alpha
        | INSIST_🐔 middle
        | INSIST_🐔 zebra"
      `);
    });

    it('handles dotted field names', () => {
      const commands = generateInsistCommands(['attributes.foo', 'body.message']);

      const query = Builder.expression.query(commands);
      const formatted = BasicPrettyPrinter.multiline(query, { pipeTab: '' });

      expect(formatted).toMatchInlineSnapshot(`
        "INSIST_🐔 \`attributes.foo\`
        | INSIST_🐔 \`body.message\`"
      `);
    });

    it('returns empty array for empty input', () => {
      const commands = generateInsistCommands([]);
      expect(commands).toHaveLength(0);
    });
  });

  describe('generateTypedEvalCasts', () => {
    it('generates EVAL casts for typed fields', () => {
      const fields: PreludeField[] = [
        { name: 'count', type: 'integer' },
        { name: 'name', type: 'keyword' },
      ];

      const commands = generateTypedEvalCasts(fields);

      const query = Builder.expression.query(commands);
      const formatted = BasicPrettyPrinter.multiline(query, { pipeTab: '' });

      expect(formatted).toMatchInlineSnapshot(`
        "EVAL count = COALESCE(NULL, count::INTEGER)
        | EVAL name = COALESCE(NULL, name::KEYWORD)"
      `);
    });

    it('skips fields without type', () => {
      const fields: PreludeField[] = [
        { name: 'typed_field', type: 'long' },
        { name: 'untyped_field' },
      ];

      const commands = generateTypedEvalCasts(fields);

      expect(commands).toHaveLength(1);

      const query = Builder.expression.query(commands);
      const formatted = BasicPrettyPrinter.multiline(query, { pipeTab: '' });

      expect(formatted).toMatchInlineSnapshot(
        `"EVAL typed_field = COALESCE(NULL, typed_field::LONG)"`
      );
    });

    it('sorts fields alphabetically for deterministic output', () => {
      const fields: PreludeField[] = [
        { name: 'z_field', type: 'boolean' },
        { name: 'a_field', type: 'double' },
      ];

      const commands = generateTypedEvalCasts(fields);

      const query = Builder.expression.query(commands);
      const formatted = BasicPrettyPrinter.multiline(query, { pipeTab: '' });

      expect(formatted).toMatchInlineSnapshot(`
        "EVAL a_field = COALESCE(NULL, a_field::DOUBLE)
        | EVAL z_field = COALESCE(NULL, z_field::BOOLEAN)"
      `);
    });

    it('handles all supported field types', () => {
      const fields: PreludeField[] = [
        { name: 'field_keyword', type: 'keyword' },
        { name: 'field_text', type: 'text' },
        { name: 'field_match_only_text', type: 'match_only_text' },
        { name: 'field_long', type: 'long' },
        { name: 'field_integer', type: 'integer' },
        { name: 'field_short', type: 'short' },
        { name: 'field_byte', type: 'byte' },
        { name: 'field_double', type: 'double' },
        { name: 'field_float', type: 'float' },
        { name: 'field_half_float', type: 'half_float' },
        { name: 'field_unsigned_long', type: 'unsigned_long' },
        { name: 'field_boolean', type: 'boolean' },
        { name: 'field_date', type: 'date' },
        { name: 'field_date_nanos', type: 'date_nanos' },
        { name: 'field_ip', type: 'ip' },
        { name: 'field_version', type: 'version' },
        { name: 'field_geo_point', type: 'geo_point' },
      ];

      const commands = generateTypedEvalCasts(fields);

      const query = Builder.expression.query(commands);
      const formatted = BasicPrettyPrinter.multiline(query, { pipeTab: '' });

      expect(formatted).toMatchInlineSnapshot(`
        "EVAL field_boolean = COALESCE(NULL, field_boolean::BOOLEAN)
        | EVAL field_byte = COALESCE(NULL, field_byte::INTEGER)
        | EVAL field_date = COALESCE(NULL, field_date::DATETIME)
        | EVAL field_date_nanos = COALESCE(NULL, field_date_nanos::DATETIME)
        | EVAL field_double = COALESCE(NULL, field_double::DOUBLE)
        | EVAL field_float = COALESCE(NULL, field_float::DOUBLE)
        | EVAL field_geo_point = COALESCE(NULL, field_geo_point::GEO_POINT)
        | EVAL field_half_float = COALESCE(NULL, field_half_float::DOUBLE)
        | EVAL field_integer = COALESCE(NULL, field_integer::INTEGER)
        | EVAL field_ip = COALESCE(NULL, field_ip::IP)
        | EVAL field_keyword = COALESCE(NULL, field_keyword::KEYWORD)
        | EVAL field_long = COALESCE(NULL, field_long::LONG)
        | EVAL field_match_only_text = COALESCE(NULL, field_match_only_text::KEYWORD)
        | EVAL field_short = COALESCE(NULL, field_short::INTEGER)
        | EVAL field_text = COALESCE(NULL, field_text::KEYWORD)
        | EVAL field_unsigned_long = COALESCE(NULL, field_unsigned_long::UNSIGNED_LONG)
        | EVAL field_version = COALESCE(NULL, field_version::VERSION)"
      `);
    });

    it('handles dotted field names', () => {
      const fields: PreludeField[] = [{ name: 'attributes.count', type: 'integer' }];

      const commands = generateTypedEvalCasts(fields);

      const query = Builder.expression.query(commands);
      const formatted = BasicPrettyPrinter.multiline(query, { pipeTab: '' });

      expect(formatted).toMatchInlineSnapshot(
        `"EVAL \`attributes.count\` = COALESCE(NULL, \`attributes.count\`::INTEGER)"`
      );
    });

    it('returns empty array for empty input', () => {
      const commands = generateTypedEvalCasts([]);
      expect(commands).toHaveLength(0);
    });
  });

  describe('generatePrelude', () => {
    it('generates combined INSIST_🐔 and EVAL commands', () => {
      const result = generatePrelude({
        fields: [
          { name: 'attributes.status', type: 'keyword' },
          { name: 'attributes.count', type: 'integer' },
        ],
      });

      expect(result.commands).toHaveLength(4); // 2 INSIST + 2 EVAL
      expect(result.query).toMatchInlineSnapshot(`
        "INSIST_🐔 \`attributes.count\`
          | INSIST_🐔 \`attributes.status\`
          | EVAL \`attributes.count\` = COALESCE(NULL, \`attributes.count\`::INTEGER)
          | EVAL \`attributes.status\` = COALESCE(NULL, \`attributes.status\`::KEYWORD)"
      `);
    });

    it('generates only INSIST_🐔 for untyped fields', () => {
      const result = generatePrelude({
        fields: [{ name: 'attributes.foo' }, { name: 'body.message' }],
      });

      expect(result.commands).toHaveLength(2); // 2 INSIST only
      expect(result.query).toMatchInlineSnapshot(`
        "INSIST_🐔 \`attributes.foo\`
          | INSIST_🐔 \`body.message\`"
      `);
    });

    it('returns empty results for empty fields', () => {
      const result = generatePrelude({ fields: [] });

      expect(result.commands).toHaveLength(0);
      expect(result.query).toBe('');
    });

    it('maintains deterministic order (sorted by field name)', () => {
      const result1 = generatePrelude({
        fields: [
          { name: 'z_field', type: 'long' },
          { name: 'a_field', type: 'keyword' },
          { name: 'm_field', type: 'boolean' },
        ],
      });

      const result2 = generatePrelude({
        fields: [
          { name: 'm_field', type: 'boolean' },
          { name: 'a_field', type: 'keyword' },
          { name: 'z_field', type: 'long' },
        ],
      });

      // Both should produce the same output regardless of input order
      expect(result1.query).toBe(result2.query);
      expect(result1.query).toMatchInlineSnapshot(`
        "INSIST_🐔 a_field
          | INSIST_🐔 m_field
          | INSIST_🐔 z_field
          | EVAL a_field = COALESCE(NULL, a_field::KEYWORD)
          | EVAL m_field = COALESCE(NULL, m_field::BOOLEAN)
          | EVAL z_field = COALESCE(NULL, z_field::LONG)"
      `);
    });

    it('handles mixed typed and untyped fields', () => {
      const result = generatePrelude({
        fields: [{ name: 'typed_field', type: 'integer' }, { name: 'untyped_field' }],
      });

      expect(result.commands).toHaveLength(3); // 2 INSIST + 1 EVAL
      expect(result.query).toMatchInlineSnapshot(`
        "INSIST_🐔 typed_field
          | INSIST_🐔 untyped_field
          | EVAL typed_field = COALESCE(NULL, typed_field::INTEGER)"
      `);
    });
  });
});
