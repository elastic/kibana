/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangDSL } from '../../../types/streamlang';
import { transpile } from '.';
import {
  comprehensiveTestDSL,
  manualIngestPipelineTestDSL,
  notConditionsTestDSL,
  typeCoercionsTestDSL,
} from '../shared/mocks/test_dsls';

describe('transpile - Streamlang DSL to ES|QL)', () => {
  it('should transpile a variety of processor steps and where blocks', async () => {
    const result = await transpile(comprehensiveTestDSL);
    expect(result.query).toMatchSnapshot();
  });

  it('should handle not conditions', async () => {
    const result = await transpile(notConditionsTestDSL);
    expect(result.query).toMatchSnapshot();
  });

  it('should handle type coercions', async () => {
    const result = await transpile(typeCoercionsTestDSL);
    expect(result).toMatchSnapshot();
  });

  it('should warn when manual_ingest_pipeline is used', async () => {
    const result = await transpile(manualIngestPipelineTestDSL);
    expect(result.query).toMatchSnapshot();
  });

  it('should reject mustache template syntax in json_extract field names', async () => {
    const dsl = {
      steps: [
        {
          action: 'json_extract',
          field: '{{template_field}}',
          extractions: [{ selector: 'user_id', target_field: 'user_id' }],
        },
      ],
    } as unknown as StreamlangDSL;

    await expect(transpile(dsl)).rejects.toThrow();
  });

  it('should reject invalid json_extract selectors', async () => {
    const dsl = {
      steps: [
        {
          action: 'json_extract',
          field: 'message',
          extractions: [{ selector: 'a..b', target_field: 'extracted' }],
        },
      ],
    } as unknown as StreamlangDSL;

    await expect(transpile(dsl)).rejects.toThrow('consecutive dots');
  });
});
