/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { ALWAYS_CONDITION } from '@kbn/streamlang';
import { findConditionById } from './simulation_state_machine';

const makeAction = (
  id: string,
  parentId: StreamlangStepWithUIAttributes['parentId'] = null
): StreamlangStepWithUIAttributes =>
  ({
    customIdentifier: id,
    parentId,
    action: 'set',
    from: 'foo',
    to: 'bar',
    where: ALWAYS_CONDITION,
  } as StreamlangStepWithUIAttributes);

const makeConditionBlock = (
  id: string,
  condition: object,
  parentId: StreamlangStepWithUIAttributes['parentId'] = null
): StreamlangStepWithUIAttributes =>
  ({
    customIdentifier: id,
    parentId,
    condition: {
      ...condition,
      steps: [],
    },
  } as unknown as StreamlangStepWithUIAttributes);

describe('Simulation state machine helpers', () => {
  describe('findConditionById', () => {
    const steps: StreamlangStepWithUIAttributes[] = [
      makeAction('p1'),
      makeConditionBlock('c1', { field: 'level', eq: 'error' }),
      makeAction('p2', 'c1'),
      makeConditionBlock('c2', { field: 'service', contains: 'api' }, 'c1'),
      makeAction('p3', 'c2'),
      makeAction('p4'),
    ];

    it('finds a condition by its id', () => {
      const condition = findConditionById(steps, 'c1');
      expect(condition).toEqual({ field: 'level', eq: 'error' });
    });

    it('finds a nested condition by its id', () => {
      const condition = findConditionById(steps, 'c2');
      expect(condition).toEqual({ field: 'service', contains: 'api' });
    });

    it('returns undefined when condition id is not found', () => {
      const condition = findConditionById(steps, 'nonexistent');
      expect(condition).toBeUndefined();
    });

    it('returns undefined for empty steps', () => {
      const condition = findConditionById([], 'c1');
      expect(condition).toBeUndefined();
    });

    it('does not return action steps as conditions', () => {
      const condition = findConditionById(steps, 'p1');
      expect(condition).toBeUndefined();
    });

    it('excludes nested steps from the returned condition', () => {
      const stepsWithNestedContent: StreamlangStepWithUIAttributes[] = [
        {
          customIdentifier: 'c1',
          parentId: null,
          condition: {
            field: 'level',
            eq: 'error',
            steps: [{ action: 'set', from: 'a', to: 'b' }],
          },
        } as unknown as StreamlangStepWithUIAttributes,
      ];
      const condition = findConditionById(stepsWithNestedContent, 'c1');
      expect(condition).toEqual({ field: 'level', eq: 'error' });
      expect(condition).not.toHaveProperty('steps');
    });
  });
});
