/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery, toKqlExpression } from '@kbn/es-query';

import { AGENT_FREE_TEXT_SEARCH_FIELDS, restrictAgentFreeTextSearch } from './free_text_kuery';

const rewrite = (kuery: string): string =>
  toKqlExpression(restrictAgentFreeTextSearch(fromKueryExpression(kuery)));

const expectedFreeText = (value: string): string =>
  `(${AGENT_FREE_TEXT_SEARCH_FIELDS.map((field) => `${field}: ${value}`).join(' OR ')})`;

describe('AGENT_FREE_TEXT_SEARCH_FIELDS', () => {
  it('includes the keyword and text agent fields', () => {
    expect(AGENT_FREE_TEXT_SEARCH_FIELDS).toEqual(
      expect.arrayContaining([
        'agent.id',
        'agent.version',
        'local_metadata.host.hostname',
        'local_metadata.host.hostname.keyword',
        'policy_id',
        'tags',
      ])
    );
  });

  it('includes the keyword multi-fields declared under `fields`', () => {
    expect(AGENT_FREE_TEXT_SEARCH_FIELDS).toEqual(
      expect.arrayContaining([
        'upgrade_details.target_version',
        'upgrade_details.target_version.keyword',
        'upgrade_details.metadata.error_msg',
        'upgrade_details.metadata.error_msg.keyword',
        'upgrade_details.metadata.retry_error_msg.keyword',
      ])
    );
  });

  it('does not include non-string fields', () => {
    expect(AGENT_FREE_TEXT_SEARCH_FIELDS).not.toEqual(
      expect.arrayContaining(['enrolled_at', 'active', 'policy_revision_idx'])
    );
  });

  it('includes the queryable string fields that AGENT_MAPPINGS does not declare', () => {
    expect(AGENT_FREE_TEXT_SEARCH_FIELDS).toContain('audit_unenrolled_reason');
  });

  it('does not include runtime fields', () => {
    expect(
      AGENT_FREE_TEXT_SEARCH_FIELDS.filter((field) =>
        ['status', 'signals', 'pipeline_config'].includes(field)
      )
    ).toEqual([]);
  });

  it('only includes fields that are not API keys', () => {
    expect(AGENT_FREE_TEXT_SEARCH_FIELDS.filter((field) => field.endsWith('api_key'))).toEqual([]);
  });
});

describe('restrictAgentFreeTextSearch', () => {
  it('leaves terms that name a field unchanged', () => {
    expect(rewrite('policy_id:policy-1 and not tags:prod')).toEqual(
      '(policy_id: policy-1 AND NOT tags: prod)'
    );
  });

  it('rewrites a plain free text term', () => {
    expect(rewrite('host-1')).toEqual(expectedFreeText('host-1'));
  });

  it('rewrites a wildcard free text term', () => {
    expect(rewrite('host*')).toEqual(expectedFreeText('host*'));
  });

  it('keeps a quoted free text term quoted', () => {
    expect(rewrite('"my host"')).toEqual(expectedFreeText('"my host"'));
  });

  it('rewrites free text terms nested in and, or and not', () => {
    expect(rewrite('agent.id:agent-1 and (foo or not bar*)')).toEqual(
      `(agent.id: agent-1 AND (${expectedFreeText('foo')} OR NOT ${expectedFreeText('bar*')}))`
    );
  });

  it('builds a query that names the fields it searches', () => {
    const query = toElasticsearchQuery(
      restrictAgentFreeTextSearch(fromKueryExpression('agent.id:agent-1 and abc*'))
    );
    const serialized = JSON.stringify(query);

    expect(serialized).not.toContain('multi_match');
    expect(serialized).not.toMatch(/"query_string":\{"query"/);
    expect(serialized).not.toContain('api_key"');
    expect(query).toEqual({
      bool: {
        filter: [
          { bool: { should: [{ match: { 'agent.id': 'agent-1' } }], minimum_should_match: 1 } },
          {
            bool: {
              should: expect.arrayContaining([
                {
                  bool: {
                    should: [
                      { query_string: { fields: ['local_metadata.host.hostname'], query: 'abc*' } },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ]),
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  });
});
