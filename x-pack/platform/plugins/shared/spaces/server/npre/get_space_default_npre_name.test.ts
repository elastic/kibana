/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSpaceDefaultNpreName } from './get_space_default_npre_name';

describe('getSpaceDefaultNpreName', () => {
  it('should generate correct npre name for a space id', () => {
    expect(getSpaceDefaultNpreName('foo')).toBe('kibana_space_foo_default');
    expect(getSpaceDefaultNpreName('my-space')).toBe('kibana_space_my-space_default');
    expect(getSpaceDefaultNpreName('my_space')).toBe('kibana_space_my_space_default');
    expect(getSpaceDefaultNpreName('space123')).toBe('kibana_space_space123_default');
  });
});
