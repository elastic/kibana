/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sourceSchema } from './transforms';

describe('transform source schema', () => {
  it('accepts project routing', () => {
    expect(
      sourceSchema.validate({
        index: ['the-data-view-title'],
        project_routing: '_alias:*',
      })
    ).toEqual({
      index: ['the-data-view-title'],
      project_routing: '_alias:*',
    });
  });
});
