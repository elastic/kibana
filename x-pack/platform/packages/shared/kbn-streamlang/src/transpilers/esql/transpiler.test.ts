/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transpile } from '.';
import {
  comprehensiveTestDSL,
  manualIngestPipelineTestDSL,
  notConditionsTestDSL,
  typeCoercionsTestDSL,
} from '../shared/mocks/test_dsls';

describe('transpile - Streamlang DSL to ES|QL)', () => {
  it('should transpile a variety of processor steps and where blocks', () => {
    const result = transpile(comprehensiveTestDSL);
    expect(result.query).toMatchSnapshot();
  });

  it('should handle not conditions', () => {
    const result = transpile(notConditionsTestDSL);
    expect(result.query).toMatchSnapshot();
  });

  it('should handle type coercions', () => {
    const result = transpile(typeCoercionsTestDSL);
    expect(result).toMatchSnapshot();
  });

  it('should warn when manual_ingest_pipeline is used', () => {
    const result = transpile(manualIngestPipelineTestDSL);
    expect(result.query).toMatchSnapshot();
  });
});
