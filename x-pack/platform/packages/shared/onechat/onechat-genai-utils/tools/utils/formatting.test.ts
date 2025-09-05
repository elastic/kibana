/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatFieldAsXml } from './formatting';

describe('formatFieldAsXml', () => {
  it('should generate a correct XML tag for a standard field', () => {
    const formatted = formatFieldAsXml({
      path: 'user.name',
      type: 'keyword',
      meta: {
        description: 'The full name of the user.',
      },
    });

    expect(formatted).toBe(
      '<field path="user.name" type="keyword" description="The full name of the user." />'
    );
  });
});
