/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexTemplate } from './documents';
import { getEsNames } from './names';

describe('getIndexTemplate()', () => {
  const esNames = getEsNames('XYZ');

  test('returns the correct details of the index template', () => {
    const indexTemplate = getIndexTemplate(esNames);
    expect(indexTemplate.index_patterns).toEqual([esNames.dataStream]);
    expect(indexTemplate.template.settings.number_of_shards).toBeGreaterThanOrEqual(0);
    expect(indexTemplate.template.settings.auto_expand_replicas).toBe('0-1');
    expect(indexTemplate.template.mappings).toMatchObject({});
  });
});
