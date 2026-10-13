/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visualizationCreationSkill } from './visualization_creation_skill';

describe('visualizationCreationSkill', () => {
  it('finds unnamed data in one broad index search without probing it', () => {
    const { content } = visualizationCreationSkill;
    expect(content).toContain(
      'find it in one `platform.core.list_indices` call with a broad pattern around the topic (e.g. `*log*`, not `logs-*`)'
    );
    expect(content).toContain('Do not query the data before generating');
    expect(content).not.toContain('optionally probe with');
  });
});
