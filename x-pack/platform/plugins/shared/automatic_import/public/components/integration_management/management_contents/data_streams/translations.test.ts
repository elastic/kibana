/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EDIT_PIPELINE_FLYOUT } from './translations';

describe('EDIT_PIPELINE_FLYOUT field lists', () => {
  it('describes a single dropped field type change', () => {
    expect(EDIT_PIPELINE_FLYOUT.droppedFieldTypesDescription(['a'])).toBe(
      'The ingest pipeline no longer produces a, so its field type change will be removed when you save.'
    );
  });

  it('lists several dropped field type changes', () => {
    expect(EDIT_PIPELINE_FLYOUT.droppedFieldTypesDescription(['a', 'b', 'c'])).toBe(
      'The ingest pipeline no longer produces a, b, and c, so their field type changes will be removed when you save.'
    );
  });

  it('truncates a long list of removed approved fields', () => {
    const fieldNames = Array.from({ length: 12 }, (_, index) => `f${index}`);

    expect(EDIT_PIPELINE_FLYOUT.breakingChangesDescription(fieldNames)).toMatch(
      /^f0, f1, f2, f3, f4, f5, f6, f7, f8, f9, and 2 more were in an approved version/
    );
  });
});
