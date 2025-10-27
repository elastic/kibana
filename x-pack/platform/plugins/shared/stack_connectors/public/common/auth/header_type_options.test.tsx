/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { headerTypeOptions } from './header_type_options';

describe('headerTypeOptions', () => {
  it('should have config and secret options', () => {
    expect(headerTypeOptions).toHaveLength(2);
    const configOption = headerTypeOptions.find((option) => option.value === 'config');
    const secretOption = headerTypeOptions.find((option) => option.value === 'secret');

    expect(configOption).toBeDefined();
    expect(secretOption).toBeDefined();

    expect(configOption!['data-test-subj']).toBe('option-config');
    expect(secretOption!['data-test-subj']).toBe('option-secret');
  });
});
