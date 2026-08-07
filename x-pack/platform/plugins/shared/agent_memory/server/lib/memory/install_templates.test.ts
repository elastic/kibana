/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoryDataStreamDefinitions } from './install_templates';

describe('memory data stream definitions', () => {
  const names = memoryDataStreamDefinitions.map((definition) => definition.name);

  /**
   * Index templates match on `<name>*`, so if one data stream's name is a prefix of
   * another's, both templates match the same index. Elasticsearch rejects that when
   * the templates share a priority — and it fails at install time, in a running
   * deployment, not in CI. Hence this test.
   */
  it('has no name that is a prefix of another', () => {
    for (const name of names) {
      const collisions = names.filter((other) => other !== name && other.startsWith(name));
      expect(collisions).toEqual([]);
    }
  });

  it('keeps every data stream hidden', () => {
    for (const definition of memoryDataStreamDefinitions) {
      expect(definition.hidden).toBe(true);
    }
  });

  it('avoids the .kibana prefixes Elasticsearch treats as system indices', () => {
    // Memory documents are written with the requesting user's credentials, so a
    // system-index name would break reads and writes for non-superusers.
    for (const name of names) {
      expect(name.startsWith('.kibana')).toBe(false);
    }
  });
});
