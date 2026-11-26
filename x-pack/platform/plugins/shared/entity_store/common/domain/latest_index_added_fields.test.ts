/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LATEST_INDEX_ADDED_FIELDS,
  getUnmappedLatestFieldPlaceholders,
} from './latest_index_added_fields';

describe('getUnmappedLatestFieldPlaceholders', () => {
  it('returns one placeholder step per listed field when no filter is given', () => {
    expect(getUnmappedLatestFieldPlaceholders()).toEqual(
      LATEST_INDEX_ADDED_FIELDS.map(({ field }) => `| EVAL ${field} = TO_STRING(null)`)
    );
    expect(getUnmappedLatestFieldPlaceholders()).toEqual([
      '| EVAL user.entity.id = TO_STRING(null)',
      '| EVAL entity.relationships.acts_on_behalf_of.ids = TO_STRING(null)',
      '| EVAL entity.relationships.acts_on_behalf_of.raw_identifiers.host.id = TO_STRING(null)',
      '| EVAL entity.relationships.acts_on_behalf_of.raw_identifiers.host.name = TO_STRING(null)',
      '| EVAL entity.relationships.acts_on_behalf_of.raw_identifiers.service.name = TO_STRING(null)',
      '| EVAL entity.relationships.acts_on_behalf_of.raw_identifiers.user.email = TO_STRING(null)',
      '| EVAL entity.relationships.acts_on_behalf_of.raw_identifiers.user.id = TO_STRING(null)',
      '| EVAL entity.relationships.acts_on_behalf_of.raw_identifiers.user.name = TO_STRING(null)',
      '| EVAL process.ai_agent.name = TO_STRING(null)',
      '| EVAL process.executable = TO_STRING(null)',
    ]);
  });

  it('returns the placeholder of a listed field that the filter names', () => {
    expect(getUnmappedLatestFieldPlaceholders(['user.id', 'user.entity.id'])).toEqual([
      '| EVAL user.entity.id = TO_STRING(null)',
    ]);
  });

  it('returns nothing for an empty filter', () => {
    expect(getUnmappedLatestFieldPlaceholders([])).toEqual([]);
  });

  it('ignores filter names that are not in the list', () => {
    expect(getUnmappedLatestFieldPlaceholders(['host.name', 'user.id'])).toEqual([]);
  });
});
