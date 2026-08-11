/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangDSL, StreamlangStep } from '@kbn/streamlang/types/streamlang';
import { stripCustomIdentifiers } from './strip_custom_identifiers';

describe('stripCustomIdentifiers', () => {
  it('strips identifiers from if-branch steps', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          condition: {
            field: 'a',
            eq: '1',
            steps: [{ action: 'set', to: 'b', value: '2', customIdentifier: 'id1' }],
          },
          customIdentifier: 'cond1',
        },
      ],
    };

    const result = stripCustomIdentifiers(dsl);
    expect(result.steps[0]).not.toHaveProperty('customIdentifier');
    const block = result.steps[0] as { condition: { steps: StreamlangStep[] } };
    expect(block.condition.steps[0]).not.toHaveProperty('customIdentifier');
  });

  it('strips identifiers from else-branch steps', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          condition: {
            field: 'a',
            eq: '1',
            steps: [{ action: 'set', to: 'b', value: '2', customIdentifier: 'id1' }],
            else: [{ action: 'set', to: 'c', value: '3', customIdentifier: 'id2' }],
          },
          customIdentifier: 'cond1',
        },
      ],
    };

    const result = stripCustomIdentifiers(dsl);
    const block = result.steps[0] as {
      condition: { steps: StreamlangStep[]; else?: StreamlangStep[] };
    };
    expect(block.condition.else).toHaveLength(1);
    expect(block.condition.else![0]).not.toHaveProperty('customIdentifier');
  });

  it('strips identifiers from nested conditions inside else branches', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          condition: {
            field: 'a',
            eq: '1',
            steps: [],
            else: [
              {
                condition: {
                  field: 'b',
                  eq: '2',
                  steps: [{ action: 'set', to: 'c', value: '3', customIdentifier: 'inner-id' }],
                },
                customIdentifier: 'inner-cond',
              },
            ],
          },
          customIdentifier: 'outer-cond',
        },
      ],
    };

    const result = stripCustomIdentifiers(dsl);
    expect(result.steps[0]).not.toHaveProperty('customIdentifier');
    const outer = result.steps[0] as {
      condition: {
        else?: Array<{ customIdentifier?: string; condition: { steps: StreamlangStep[] } }>;
      };
    };
    expect(outer.condition.else![0]).not.toHaveProperty('customIdentifier');
    expect(outer.condition.else![0].condition.steps[0]).not.toHaveProperty('customIdentifier');
  });

  it('omits else key when not present in original', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          condition: {
            field: 'a',
            eq: '1',
            steps: [{ action: 'set', to: 'b', value: '2', customIdentifier: 'id1' }],
          },
          customIdentifier: 'cond1',
        },
      ],
    };

    const result = stripCustomIdentifiers(dsl);
    const block = result.steps[0] as {
      condition: { steps: StreamlangStep[]; else?: StreamlangStep[] };
    };
    expect(block.condition.else).toBeUndefined();
  });
});
