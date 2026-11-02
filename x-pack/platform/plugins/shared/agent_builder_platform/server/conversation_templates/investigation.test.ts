/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { investigationTemplate } from './investigation';

describe('investigation conversation template', () => {
  it.each(['telemetry_target', 'telemetry_not_after'])(
    'marks %s immutable, so metadata writes cannot change it',
    (field) => {
      expect(investigationTemplate.fields[field].immutable).toBe(true);
    }
  );
});
