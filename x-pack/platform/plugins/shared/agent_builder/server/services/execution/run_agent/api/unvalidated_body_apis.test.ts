/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBodyValidationSkipped } from './unvalidated_body_apis';

describe('isBodyValidationSkipped', () => {
  it.each(['cluster.put_component_template', 'indices.create', 'indices.put_mapping'])(
    'skips body validation for the Elasticsearch API %s',
    (api) => {
      expect(isBodyValidationSkipped('elasticsearch', api)).toBe(true);
    }
  );

  it('keeps body validation for every other Elasticsearch API', () => {
    expect(isBodyValidationSkipped('elasticsearch', 'search')).toBe(false);
    expect(isBodyValidationSkipped('elasticsearch', 'indices.delete')).toBe(false);
  });

  it('keeps body validation for a Kibana API named like a listed Elasticsearch one', () => {
    expect(isBodyValidationSkipped('kibana', 'indices.create')).toBe(false);
  });
});
