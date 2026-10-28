/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatEvidenceForAgent } from './format_evidence';

describe('formatEvidenceForAgent', () => {
  it('lists links and queries after the description', () => {
    expect(
      formatEvidenceForAgent({
        description: 'Errors spiked.',
        references: [
          { url: 'https://github.com/elastic/kibana/pull/1', label: 'Deploy PR' },
          { query: 'FROM logs-* | LIMIT 1' },
        ],
      })
    ).toBe(
      [
        'Errors spiked.',
        'Link: Deploy PR: https://github.com/elastic/kibana/pull/1',
        'Query: FROM logs-* | LIMIT 1',
      ].join('\n')
    );
  });
});
