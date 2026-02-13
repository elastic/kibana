/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transpile, type PreludeField } from '.';
import {
  comprehensiveTestDSL,
  manualIngestPipelineTestDSL,
  notConditionsTestDSL,
  typeCoercionsTestDSL,
} from '../shared/mocks/test_dsls';
import type { StreamlangDSL } from '../../../types/streamlang';
import type { SetProcessor } from '../../../types/processors';

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

  describe('prelude support', () => {
    const simpleTestDSL: StreamlangDSL = {
      steps: [
        {
          action: 'set',
          to: 'attributes.status',
          value: 'active',
        } as SetProcessor,
      ],
    };

    it('should include prelude when preludeFields are provided', () => {
      const preludeFields: PreludeField[] = [
        { name: 'attributes.foo', type: 'integer' },
        { name: 'body.message', type: 'keyword' },
      ];

      const result = transpile(simpleTestDSL, { pipeTab: '  ', preludeFields });

      expect(result.prelude).toBeDefined();
      expect(result.query).toMatchSnapshot();
    });

    it('should return undefined prelude when no preludeFields provided', () => {
      const result = transpile(simpleTestDSL, { pipeTab: '  ' });

      expect(result.prelude).toBeUndefined();
    });

    it('should return undefined prelude when preludeFields is empty', () => {
      const result = transpile(simpleTestDSL, { pipeTab: '  ', preludeFields: [] });

      expect(result.prelude).toBeUndefined();
    });

    it('should prepend INSIST_🐔 and typed EVAL casts in deterministic order', () => {
      const preludeFields: PreludeField[] = [
        { name: 'z_field', type: 'long' },
        { name: 'a_field', type: 'boolean' },
        { name: 'm_field' }, // untyped
      ];

      const result = transpile(simpleTestDSL, { pipeTab: '  ', preludeFields });

      // Verify the query starts with sorted INSIST commands
      expect(result.query).toContain('INSIST_🐔 a_field');
      expect(result.query).toContain('INSIST_🐔 m_field');
      expect(result.query).toContain('INSIST_🐔 z_field');

      // Verify typed EVALs are included (only for typed fields)
      expect(result.query).toContain('a_field::BOOLEAN');
      expect(result.query).toContain('z_field::LONG');
      expect(result.query).not.toContain('m_field::'); // untyped field has no cast

      expect(result.query).toMatchSnapshot();
    });
  });
});
