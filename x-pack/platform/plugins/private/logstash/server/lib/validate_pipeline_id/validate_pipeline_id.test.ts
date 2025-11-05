/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validatePipelineId } from './validate_pipeline_id';

describe('validatePipelineId', () => {
  it('accepts valid pipeline IDs', () => {
    expect(validatePipelineId('_startwithunderscore')).toBeUndefined();
    expect(validatePipelineId('startwithloweralpha')).toBeUndefined();
    expect(validatePipelineId('Startwithupperalpha')).toBeUndefined();
    expect(validatePipelineId('_us-with-dashes')).toBeUndefined();
    expect(validatePipelineId('_us-With-UPPER-alpha')).toBeUndefined();
    expect(validatePipelineId('pipeline123')).toBeUndefined();
    expect(validatePipelineId('_pipeline_123')).toBeUndefined();
  });

  it('rejects invalid pipeline IDs', () => {
    expect(validatePipelineId('kibana.api')).toBeDefined();
    expect(validatePipelineId('contains a space')).toBeDefined();
    expect(validatePipelineId('8startswithnum')).toBeDefined();
    expect(validatePipelineId(' startswithspace')).toBeDefined();
    expect(validatePipelineId('endswithspace ')).toBeDefined();
    expect(validatePipelineId('a?')).toBeDefined();
    expect(validatePipelineId('?')).toBeDefined();
    expect(validatePipelineId('+')).toBeDefined();
    expect(validatePipelineId('f+')).toBeDefined();
    expect(validatePipelineId('pipeline@name')).toBeDefined();
    expect(validatePipelineId('pipeline#name')).toBeDefined();
  });

  it('returns proper error message for invalid IDs', () => {
    const result = validatePipelineId('kibana.api');
    expect(result).toContain('Pipeline ID must begin with a letter or underscore');
    expect(result).toContain('contain only letters, underscores, dashes, hyphens, and numbers');
  });
});
