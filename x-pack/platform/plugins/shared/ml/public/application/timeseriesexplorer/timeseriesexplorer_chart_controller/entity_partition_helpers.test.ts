/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCriteriaFields } from './entity_partition_helpers';

describe('buildCriteriaFields', () => {
  it('includes detector_index and non-blank entity fields', () => {
    const fields = buildCriteriaFields(2, [
      { fieldName: 'airline', fieldValue: 'AAL' },
      { fieldName: 'host', fieldValue: null },
    ]);
    expect(fields).toEqual([
      { fieldName: 'detector_index', fieldValue: 2 },
      { fieldName: 'airline', fieldValue: 'AAL' },
    ]);
  });

  it('returns only detector_index when all entity values are null', () => {
    expect(buildCriteriaFields(0, [{ fieldName: 'x', fieldValue: null }])).toEqual([
      { fieldName: 'detector_index', fieldValue: 0 },
    ]);
  });
});
