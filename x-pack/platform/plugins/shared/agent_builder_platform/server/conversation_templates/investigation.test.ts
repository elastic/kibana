/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { investigationTemplate } from './investigation';

describe('investigation conversation template', () => {
  it.each([
    ['automation_id', 500],
    ['automation_name', 500],
  ])('declares the optional bounded text field %s', (name, maxLength) => {
    expect(investigationTemplate.fields[name]).toMatchObject({
      input_type: 'TEXT',
      required: false,
      max_length: maxLength,
    });
  });
});
