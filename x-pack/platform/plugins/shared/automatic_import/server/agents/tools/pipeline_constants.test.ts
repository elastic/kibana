/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BOILERPLATE_PIPELINE,
  BOILERPLATE_PROCESSOR_COUNT,
  TEMP_FIELD,
} from './pipeline_constants';

describe('BOILERPLATE_PIPELINE', () => {
  it('removes the temporary field in the on_failure handler so failed documents do not keep it', () => {
    const removeProcessors = BOILERPLATE_PIPELINE.on_failure.filter(
      (processor) => 'remove' in processor
    );

    expect(removeProcessors).toHaveLength(1);
    expect(removeProcessors[0]).toMatchObject({
      remove: { field: TEMP_FIELD, ignore_missing: true },
    });
  });

  it('keeps the error bookkeeping processors in the on_failure handler', () => {
    const types = BOILERPLATE_PIPELINE.on_failure.map((processor) => Object.keys(processor)[0]);

    expect(types).toEqual(expect.arrayContaining(['set', 'append']));
  });

  it('does not change the number of pre-seeded processors', () => {
    expect(BOILERPLATE_PROCESSOR_COUNT).toBe(3);
  });
});
