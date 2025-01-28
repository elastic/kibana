/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeHostsForAgents } from './hosts_utils';

describe('normalizeHostsForAgents', () => {
  const scenarios = [
    { sourceUrl: 'http://test.fr', expectedUrl: 'http://test.fr:80' },
    { sourceUrl: 'http://test.fr/test/toto', expectedUrl: 'http://test.fr:80/test/toto' },
    { sourceUrl: 'https://test.fr', expectedUrl: 'https://test.fr:443' },
    { sourceUrl: 'https://test.fr/test/toto', expectedUrl: 'https://test.fr:443/test/toto' },
    { sourceUrl: 'https://test.fr:9243', expectedUrl: 'https://test.fr:9243' },
    { sourceUrl: 'https://test.fr:9243/test/toto', expectedUrl: 'https://test.fr:9243/test/toto' },
  ];

  for (const scenario of scenarios) {
    it(`should transform ${scenario.sourceUrl} correctly`, () => {
      const url = normalizeHostsForAgents(scenario.sourceUrl);

      expect(url).toEqual(scenario.expectedUrl);
    });
  }
});
