/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILESTORE_ENABLED } from './constants';

describe('runner store constants', () => {
  it('should be false', () => {
    // ensures this is not accidentally enabled.
    expect(FILESTORE_ENABLED).toBe(false);
  });
});
