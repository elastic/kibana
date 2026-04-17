/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStepWithUIAttributes } from '../../../types/ui';
import {
  type StreamlangConditionBlock,
  type StreamlangDSL,
  type StreamlangStep,
  isActionBlock,
  isConditionBlock,
} from '../../../types/streamlang';
import { convertStepsForUI, convertUIStepsToDSL } from './convert_for_ui';

type FlattenedStep = StreamlangStepWithUIAttributes;

describe('convertStepsForUI', () => {
  it('flattens a simple list of steps', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'foo', value: 'bar' },
        { action: 'append', to: 'baz', value: [1, 2] },
      ],
    };
    const result = convertStepsForUI(dsl) as FlattenedStep[];
    expect(result).toHaveLength(2);
    expect(isActionBlock(result[0]) && result[0].action).toBe('set');
    expect(result[0].parentId).toBeNull();
    expect(isActionBlock(result[1]) && result[1].action).toBe('append');
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
    const result = convertStepsForUI(dsl) as FlattenedStep[];
    // Should flatten to 5 steps: where, set, where, append, set
    expect(result).toHaveLength(5);

    // Top-level where
    expect(result[0]).toHaveProperty('condition');
    expect(result[0].parentId).toBeNull();

    // set inside first where
    expect(isActionBlock(result[1]) && result[1].action).toBe('set');
    expect(result[1].parentId).toBe(result[0].customIdentifier);

    // nested where inside first where
    expect(isConditionBlock(result[2])).toBe(true);
    expect(result[2].parentId).toBe(result[0].customIdentifier);

    // append inside nested where
    expect(isActionBlock(result[3]) && result[3].action).toBe('append');
    expect(result[3].parentId).toBe(result[2].customIdentifier);

    // top-level set
    expect(isActionBlock(result[4]) && result[4].action).toBe('set');
    expect(result[4].parentId).toBeNull();
  });

  it('handles empty steps', () => {
    const dsl: StreamlangDSL = { steps: [] };
    const result = convertStepsForUI(dsl);
    expect(result).toHaveLength(0);
  });

  it('flattens else branch steps with branch attribute', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          customIdentifier: 'cond1',
          condition: {
            field: 'status',
            eq: 200,
            steps: [{ customIdentifier: 'if1', action: 'set', to: 'a', value: 'b' }],
            else: [{ customIdentifier: 'else1', action: 'set', to: 'a', value: 'c' }],
          },
        },
      ],
    };
    const result = convertStepsForUI(dsl) as FlattenedStep[];
    expect(result).toHaveLength(3);

    // Condition block itself
    expect(result[0].customIdentifier).toBe('cond1');
    expect(result[0].parentId).toBeNull();

    // If-branch child
    expect(result[1].customIdentifier).toBe('if1');
    expect(result[1].parentId).toBe('cond1');
    expect(result[1].branch).toBe('if');

    // Else-branch child
    expect(result[2].customIdentifier).toBe('else1');
    expect(result[2].parentId).toBe('cond1');
    expect(result[2].branch).toBe('else');
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
    const dsl = convertUIStepsToDSL(uiSteps, false);
    expect(dsl.steps).toHaveLength(2); // where1 and set2 at root
    const where1 = dsl.steps[0];
    expect(isConditionBlock(where1)).toBe(true);
    if (!isConditionBlock(where1)) return;
    expect(where1.condition.steps).toHaveLength(2); // set1 and where2
    const where2 = where1.condition.steps.find(
      (s: StreamlangStep) => 'customIdentifier' in s && s.customIdentifier === 'where2'
    ) as StreamlangConditionBlock | undefined;
    expect(where2).toBeDefined();
    if (!where2) return;
    expect(where2.condition.steps).toHaveLength(1);
    expect(isActionBlock(where2.condition.steps[0]) && where2.condition.steps[0].action).toBe(
      'append'
    );
    const set2 = dsl.steps[1];
    expect(isActionBlock(set2) && set2.action).toBe('set');
    expect(isActionBlock(set2) && 'to' in set2 && set2.to).toBe('x');
  });

  it('handles empty input', () => {
    const dsl = convertUIStepsToDSL([]);
    expect(dsl.steps).toHaveLength(0);
  });

  it('nests else-branch steps under condition.else using branch attribute', () => {
    const uiSteps: StreamlangStepWithUIAttributes[] = [
      {
        customIdentifier: 'cond1',
        condition: { field: 'status', eq: 200 },
        parentId: null,
      },
      {
        customIdentifier: 'if1',
        action: 'set',
        to: 'a',
        value: 'b',
        parentId: 'cond1',
        branch: 'if',
      },
      {
        customIdentifier: 'else1',
        action: 'set',
        to: 'a',
        value: 'c',
        parentId: 'cond1',
        branch: 'else',
      },
    ];
    const dsl = convertUIStepsToDSL(uiSteps, false);
    expect(dsl.steps).toHaveLength(1);
    const cond = dsl.steps[0];
    expect(isConditionBlock(cond)).toBe(true);
    if (!isConditionBlock(cond)) return;
    expect(cond.condition.steps).toHaveLength(1);
    expect(cond.condition.else).toHaveLength(1);
    expect(isActionBlock(cond.condition.steps[0]) && cond.condition.steps[0].action).toBe('set');
    expect(isActionBlock(cond.condition.else![0]) && cond.condition.else![0].action).toBe('set');
  });

  it('omits else from DSL when empty', () => {
    const uiSteps: StreamlangStepWithUIAttributes[] = [
      {
        customIdentifier: 'cond1',
        condition: { field: 'status', eq: 200 },
        parentId: null,
      },
      {
        customIdentifier: 'if1',
        action: 'set',
        to: 'a',
        value: 'b',
        parentId: 'cond1',
      },
    ];
    const dsl = convertUIStepsToDSL(uiSteps);
    const cond = dsl.steps[0];
    expect(isConditionBlock(cond)).toBe(true);
    if (!isConditionBlock(cond)) return;
    expect(cond.condition.else).toBeUndefined();
  });

  it('round-trips DSL with else branches', () => {
    const originalDsl: StreamlangDSL = {
      steps: [
        {
          customIdentifier: 'cond1',
          condition: {
            field: 'env',
            eq: 'prod',
            steps: [{ customIdentifier: 'if1', action: 'set', to: 'flag', value: 'true' }],
            else: [{ customIdentifier: 'else1', action: 'set', to: 'flag', value: 'false' }],
          },
        },
      ],
    };
    const uiSteps = convertStepsForUI(originalDsl);
    const roundTrippedDsl = convertUIStepsToDSL(uiSteps, false);
    expect(roundTrippedDsl.steps).toHaveLength(1);
    const cond = roundTrippedDsl.steps[0];
    expect(isConditionBlock(cond)).toBe(true);
    if (!isConditionBlock(cond)) return;
    expect(cond.condition.steps).toHaveLength(1);
    expect(cond.condition.else).toHaveLength(1);
  });
});
