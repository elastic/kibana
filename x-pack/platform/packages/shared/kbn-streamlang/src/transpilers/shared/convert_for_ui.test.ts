/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStepWithUIAttributes } from '../../../types/ui';
import type { StreamlangDSL } from '../../../types/streamlang';
import { convertStepsForUI, convertUIStepsToDSL } from './convert_for_ui';

describe('convertStepsForUI', () => {
  it('flattens a simple list of steps', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'foo', value: 'bar' },
        { action: 'append', to: 'baz', value: [1, 2] },
      ],
    };
    const result = convertStepsForUI(dsl) as any;
    expect(result).toHaveLength(2);
    expect(result[0].action).toBe('set');
    expect(result[0].parentId).toBeNull();
    expect(result[1].action).toBe('append');
    expect(result[1].parentId).toBeNull();
  });

  it('flattens nested where blocks and assigns parentIds', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          condition: {
            field: 'foo',
            eq: 'bar',
            steps: [
              { action: 'set', to: 'a', value: 'b' },
              {
                condition: {
                  field: 'baz',
                  eq: 'qux',
                  steps: [{ action: 'append', to: 'c', value: [3] }],
                },
              },
            ],
          },
        },
        { action: 'set', to: 'x', value: 'y' },
      ],
    };
    const result = convertStepsForUI(dsl) as any;
    // Should flatten to 5 steps: where, set, where, append, set
    expect(result).toHaveLength(5);

    // Top-level where
    expect(result[0]).toHaveProperty('condition');
    expect(result[0].parentId).toBeNull();

    // set inside first where
    expect(result[1].action).toBe('set');
    expect(result[1].parentId).toBe(result[0].customIdentifier);

    // nested where inside first where
    expect(result[2]).toHaveProperty('condition');
    expect(result[2].parentId).toBe(result[0].customIdentifier);

    // append inside nested where
    expect(result[3].action).toBe('append');
    expect(result[3].parentId).toBe(result[2].customIdentifier);

    // top-level set
    expect(result[4].action).toBe('set');
    expect(result[4].parentId).toBeNull();
  });

  it('handles empty steps', () => {
    const dsl: StreamlangDSL = { steps: [] };
    const result = convertStepsForUI(dsl);
    expect(result).toHaveLength(0);
  });

  it('handles steps with existing ids', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { customIdentifier: 'custom1', action: 'set', to: 'foo', value: 'bar' },
        {
          customIdentifier: 'where1',
          condition: {
            field: 'foo',
            eq: 'bar',
            steps: [{ customIdentifier: 'custom2', action: 'set', to: 'a', value: 'b' }],
          },
        },
      ],
    };
    const result = convertStepsForUI(dsl);
    expect(result[0].customIdentifier).toBe('custom1');
    expect(result[1].customIdentifier).toBe('where1');
    expect(result[2].customIdentifier).toBe('custom2');
    expect(result[2].parentId).toBe('where1');
  });
});

describe('convertUIStepsToDSL', () => {
  it('converts a flat list of steps to DSL', () => {
    const uiSteps: StreamlangStepWithUIAttributes[] = [
      { customIdentifier: '1', action: 'set', to: 'foo', value: 'bar', parentId: null },
      { customIdentifier: '2', action: 'append', to: 'baz', value: [1, 2], parentId: null },
    ];
    const dsl = convertUIStepsToDSL(uiSteps);
    expect(dsl.steps).toHaveLength(2);
    expect('action' in dsl.steps[0] && dsl.steps[0].action).toBe('set');
    expect('action' in dsl.steps[1] && dsl.steps[1].action).toBe('append');
  });

  it('nests steps under where blocks using parentId', () => {
    const uiSteps: StreamlangStepWithUIAttributes[] = [
      {
        customIdentifier: 'where1',
        condition: { field: 'foo', eq: 'bar' },
        parentId: null,
      },
      {
        customIdentifier: 'set1',
        action: 'set',
        to: 'a',
        value: 'b',
        parentId: 'where1',
      },
      {
        customIdentifier: 'where2',
        condition: { field: 'baz', eq: 'qux' },
        parentId: 'where1',
      },
      {
        customIdentifier: 'append1',
        action: 'append',
        to: 'c',
        value: [3],
        parentId: 'where2',
      },
      {
        customIdentifier: 'set2',
        action: 'set',
        to: 'x',
        value: 'y',
        parentId: null,
      },
    ];
    const dsl = convertUIStepsToDSL(uiSteps, false) as any;
    expect(dsl.steps).toHaveLength(2); // where1 and set2 at root
    const where1 = dsl.steps[0];
    expect(where1).toHaveProperty('condition');
    expect(where1.condition.steps).toHaveLength(2); // set1 and where2
    const where2 = where1.condition.steps.find((s: any) => s.customIdentifier === 'where2');
    expect(where2).toBeDefined();
    expect(where2.condition.steps).toHaveLength(1);
    expect(where2.condition.steps[0].action).toBe('append');
    expect(dsl.steps[1].action).toBe('set');
    expect(dsl.steps[1].to).toBe('x');
  });

  it('handles empty input', () => {
    const dsl = convertUIStepsToDSL([]);
    expect(dsl.steps).toHaveLength(0);
  });
});
