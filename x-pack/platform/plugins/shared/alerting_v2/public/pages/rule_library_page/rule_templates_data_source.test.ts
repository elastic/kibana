/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toFindRuleTemplatesRequest } from './rule_templates_data_source';

describe('toFindRuleTemplatesRequest', () => {
  it('maps included and excluded tags to the API request', () => {
    expect(
      toFindRuleTemplatesRequest({
        tags: ['production'],
        excludedTags: ['deprecated'],
      })
    ).toMatchObject({
      tags: ['production'],
      excluded_tags: ['deprecated'],
    });
  });
});
