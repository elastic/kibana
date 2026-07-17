/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { smlIndexName } from './sml_storage';

describe('smlIndexName', () => {
  it('is the context-idx-sml-data index', () => {
    expect(smlIndexName).toBe('.ai-index-idx-sml-data');
  });
});
