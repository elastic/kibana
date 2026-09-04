/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { MAX_AI_INDEX_SUGGESTED_QUERY_FIELDS } from '../../common/constants';
import type { AiIndexField } from '../../common/http_api/ai_indices';
import { quoteIdentifier, quoteStringLiteral } from './esql_quote';
import { buildSuggestedQueries } from './suggested_queries';

const field = (path: string, type: string, searchable = true): AiIndexField => ({
  path,
  type,
  searchable,
  aggregatable: type === 'keyword',
});

const kiFields = [
  field('attributes', 'flattened', false),
  field('content', 'text'),
  field('content.semantic', 'semantic_text'),
  field('description', 'text'),
  field('tags', 'keyword'),
  field('title', 'text'),
  field('type', 'keyword'),
];

const base = {
  target: 'ai-index-idx-support',
  fields: kiFields,
  semanticFields: ['content.semantic'],
  topType: 'document',
};

describe('quoteIdentifier', () => {
  it('wraps in backticks and doubles embedded backticks', () => {
    expect(quoteIdentifier('content.semantic')).toBe('`content.semantic`');
    expect(quoteIdentifier('we`ird')).toBe('`we``ird`');
  });
});

describe('quoteStringLiteral', () => {
  it('escapes backslashes and double quotes', () => {
    expect(quoteStringLiteral('a"b\\c')).toBe('"a\\"b\\\\c"');
  });
});

describe('buildSuggestedQueries', () => {
  it('builds all four queries from a standard KI mapping', () => {
    const result = buildSuggestedQueries(base);

    expect(result).toEqual({
      hybrid_search: [
        'FROM ai-index-idx-support METADATA _id, _index, _score',
        '| FORK',
        '    ( WHERE MATCH(`content`, ?query) OR MATCH(`description`, ?query) OR MATCH(`title`, ?query) | SORT _score DESC | LIMIT 20 )',
        '    ( WHERE MATCH(`content.semantic`, ?query) | SORT _score DESC | LIMIT 20 )',
        '| FUSE',
        '| SORT _score DESC, _id ASC',
        '| KEEP `title`, `description`, `content`, `type`, `tags`',
        '| LIMIT 10',
      ].join('\n'),
      keyword_search: [
        'FROM ai-index-idx-support METADATA _id, _index, _score',
        '| WHERE MATCH(`content`, ?query) OR MATCH(`description`, ?query) OR MATCH(`title`, ?query)',
        '| SORT _score DESC, _id ASC',
        '| KEEP `title`, `description`, `content`, `type`, `tags`',
        '| LIMIT 10',
      ].join('\n'),
      scoped_hybrid_search: [
        'FROM ai-index-idx-support METADATA _id, _index, _score',
        '| WHERE `type` == "document"',
        '| FORK',
        '    ( WHERE MATCH(`content`, ?query) OR MATCH(`description`, ?query) OR MATCH(`title`, ?query) | SORT _score DESC | LIMIT 20 )',
        '    ( WHERE MATCH(`content.semantic`, ?query) | SORT _score DESC | LIMIT 20 )',
        '| FUSE',
        '| SORT _score DESC, _id ASC',
        '| KEEP `title`, `description`, `content`, `type`, `tags`',
        '| LIMIT 10',
      ].join('\n'),
      extract_esql_attribute: [
        'FROM ai-index-idx-support',
        '| EVAL esql = FIELD_EXTRACT(`attributes`, "esql")',
        '| WHERE esql IS NOT NULL',
        '| KEEP `title`, `description`, esql',
        '| LIMIT 10',
      ].join('\n'),
    });
  });

  it('produces queries the ES|QL parser accepts', () => {
    const queries = Object.values(buildSuggestedQueries({ ...base, topType: 'say "hi"' }));

    expect(queries).toHaveLength(4);
    for (const query of queries) {
      expect(Parser.parse(query).errors).toEqual([]);
    }
  });

  it('escapes the top type as an ES|QL string literal', () => {
    const { scoped_hybrid_search: scoped } = buildSuggestedQueries({
      ...base,
      topType: 'say "hi"',
    });

    expect(scoped).toContain('| WHERE `type` == "say \\"hi\\""');
  });

  it('prefers searchable text fields for the BM25 branch', () => {
    const { keyword_search: keyword } = buildSuggestedQueries({
      ...base,
      fields: [
        field('count', 'long'),
        field('hidden', 'text', false),
        field('notes', 'match_only_text'),
        field('tags', 'keyword'),
        field('title', 'text'),
      ],
    });

    expect(keyword).toContain('| WHERE MATCH(`notes`, ?query) OR MATCH(`title`, ?query)\n');
  });

  it('falls back to searchable keyword fields when no text field exists', () => {
    const { keyword_search: keyword, hybrid_search: hybrid } = buildSuggestedQueries({
      ...base,
      fields: [field('count', 'long'), field('status', 'keyword'), field('tags', 'keyword')],
      semanticFields: [],
    });

    expect(keyword).toContain('| WHERE MATCH(`status`, ?query) OR MATCH(`tags`, ?query)\n');
    expect(hybrid).toBeUndefined();
  });

  it('caps the number of fields per branch', () => {
    const fields = Array.from({ length: MAX_AI_INDEX_SUGGESTED_QUERY_FIELDS + 3 }, (_, i) =>
      field(`f${String(i).padStart(2, '0')}`, 'text')
    );
    const semanticFields = fields.map(({ path }) => `${path}.semantic`);

    const { hybrid_search: hybrid } = buildSuggestedQueries({ ...base, fields, semanticFields });

    const branches = hybrid?.split('\n').filter((line) => line.includes('( WHERE')) ?? [];
    expect(branches).toHaveLength(2);
    for (const branch of branches) {
      expect(branch.match(/MATCH\(/g)).toHaveLength(MAX_AI_INDEX_SUGGESTED_QUERY_FIELDS);
    }
  });

  it('omits hybrid queries without a semantic field and keeps keyword search', () => {
    const result = buildSuggestedQueries({ ...base, semanticFields: [] });

    expect(Object.keys(result).sort()).toEqual(['extract_esql_attribute', 'keyword_search']);
  });

  it('omits hybrid and keyword queries without a searchable text or keyword field', () => {
    const result = buildSuggestedQueries({
      ...base,
      fields: [
        field('content.semantic', 'semantic_text'),
        field('attributes', 'flattened', false),
        field('hidden', 'keyword', false),
      ],
    });

    expect(Object.keys(result)).toEqual(['extract_esql_attribute']);
  });

  it('omits scoped_hybrid_search without a top type', () => {
    const result = buildSuggestedQueries({ ...base, topType: undefined });

    expect(result).not.toHaveProperty('scoped_hybrid_search');
    expect(result).toHaveProperty('hybrid_search');
  });

  it('omits extract_esql_attribute unless attributes is flattened', () => {
    const without = kiFields.filter(({ path }) => path !== 'attributes');

    expect(buildSuggestedQueries({ ...base, fields: without })).not.toHaveProperty(
      'extract_esql_attribute'
    );
    for (const type of ['conflict', 'object', 'keyword']) {
      const result = buildSuggestedQueries({
        ...base,
        fields: [...without, field('attributes', type, false)],
      });
      expect(result).not.toHaveProperty('extract_esql_attribute');
    }
  });

  it('never references conflicting fields', () => {
    const result = buildSuggestedQueries({
      ...base,
      fields: kiFields.map((entry) =>
        ['title', 'description', 'type'].includes(entry.path)
          ? { ...entry, type: 'conflict' }
          : entry
      ),
    });

    for (const query of Object.values(result)) {
      expect(query).not.toMatch(/`(title|description|type)`/);
    }
    expect(result.keyword_search).toContain('| WHERE MATCH(`content`, ?query)\n');
    expect(result.keyword_search).toContain('| KEEP `content`, `tags`\n');
    expect(result.extract_esql_attribute).toContain('| KEEP esql\n');
    expect(result).not.toHaveProperty('scoped_hybrid_search');
  });

  it('omits KEEP when none of the standard KI fields exist', () => {
    const { keyword_search: keyword } = buildSuggestedQueries({
      ...base,
      fields: [field('body', 'text'), field('attributes', 'flattened', false)],
      semanticFields: [],
    });

    expect(keyword).not.toContain('KEEP');
    expect(keyword).toMatch(/\| SORT _score DESC, _id ASC\n\| LIMIT 10$/);
  });

  it('quotes every mapping-derived identifier', () => {
    const { keyword_search: keyword } = buildSuggestedQueries({
      ...base,
      fields: [field('odd name', 'text'), field('title', 'text')],
      semanticFields: [],
    });

    expect(keyword).toContain('MATCH(`odd name`, ?query)');
  });
});
