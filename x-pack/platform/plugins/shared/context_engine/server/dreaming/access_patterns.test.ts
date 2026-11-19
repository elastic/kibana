/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  accessPatternsOf,
  baseContent,
  keepVerifiedPatterns,
  renderContent,
} from './access_patterns';
import type { DreamingOperation } from './resolve_change_set';

const pattern = (example: string) => ({
  question_type: 'profile',
  esql_template: `${example} ?x`,
  esql_example: example,
  returns: 'The profile',
});

describe('access patterns', () => {
  it('renders patterns after the content and strips them again', () => {
    const rendered = renderContent('Bob is an SRE.', [pattern('FROM a | LIMIT 1')]);

    expect(rendered).toBe(
      'Bob is an SRE.\n\n## Access patterns\n- [profile] The profile\n  Template: `FROM a | LIMIT 1 ?x`\n  Example: `FROM a | LIMIT 1`'
    );
    expect(baseContent(rendered)).toBe('Bob is an SRE.');
    expect(renderContent('Plain.', [])).toBe('Plain.');
  });

  it('reads the patterns a KI carries, skipping malformed ones', () => {
    expect(
      accessPatternsOf({
        id: 'e',
        type: 'entity.person',
        title: 'Bob',
        attributes: {
          access_patterns: [JSON.stringify(pattern('FROM a')), 'not json', '{"question_type":1}'],
        },
      })
    ).toEqual([pattern('FROM a')]);
  });

  it('drops patterns whose example fails, and keeps current ones when all new ones fail', async () => {
    const operations: DreamingOperation[] = [
      {
        op: 'upsert_fact',
        id: 'fact-1',
        type: 'preference',
        title: 'T',
        content: 'C',
        accessPatterns: [pattern('FROM good'), pattern('FROM bad')],
        sourceMemoryIds: ['m-1'],
      },
      {
        op: 'upsert_entity',
        id: 'entity-person-bob',
        type: 'person',
        title: 'Bob',
        attributes: {},
        accessPatterns: [pattern('FROM bad')],
        sourceMemoryIds: ['m-1'],
      },
      { op: 'delete', id: 'fact-2' },
    ];

    const { operations: verified, dropped } = await keepVerifiedPatterns(
      operations,
      async (query) => query === 'FROM good'
    );

    expect(dropped).toBe(2);
    expect(verified[0]).toMatchObject({ accessPatterns: [pattern('FROM good')] });
    expect(verified[1]).not.toHaveProperty('accessPatterns');
    expect(verified[2]).toEqual({ op: 'delete', id: 'fact-2' });
  });
});
