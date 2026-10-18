/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_SEARCH_FIELDS } from './build_so_search';

describe('RULE_SEARCH_FIELDS', () => {
  it('contains exactly the two framework text fields and the three text builder sub-fields derived from the manifests', () => {
    // The two framework-owned text fields plus the container paths of every `text` leaf
    // in the registered builder-fields manifests (setup, note, query).  Keyword leaves
    // (severity, threat.*, etc.) are excluded because simple_query_string with a
    // trailing `*` creates phrase-prefix queries, which Elasticsearch rejects on keyword
    // fields.
    //
    // Ref: builder-type-registration-redesign.md "What this design needs from the framework"
    expect(RULE_SEARCH_FIELDS).toEqual([
      'metadata.name',
      'metadata.description',
      'metadata.builder_fields.setup',
      'metadata.builder_fields.note',
      'metadata.builder_fields.query',
    ]);
  });
});
