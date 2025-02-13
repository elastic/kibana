/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSiblingContext } from './elements';

describe('getSiblingContext', () => {
  const state = {
    transient: {
      resolvedArgs: {
        'element-foo': {
          expressionContext: {
            0: {
              state: 'ready',
              value: {
                type: 'datatable',
                columns: [
                  { name: 'project', type: 'string' },
                  { name: 'cost', type: 'string' },
                  { name: 'age', type: 'string' },
                ],
                rows: [
                  { project: 'pandas', cost: '500', age: '18' },
                  { project: 'tigers', cost: '200', age: '12' },
                ],
              },
              error: null,
            },
            1: {
              state: 'ready',
              value: {
                type: 'datatable',
                columns: [
                  { name: 'project', type: 'string' },
                  { name: 'cost', type: 'string' },
                  { name: 'age', type: 'string' },
                ],
                rows: [
                  { project: 'tigers', cost: '200', age: '12' },
                  { project: 'pandas', cost: '500', age: '18' },
                ],
              },
              error: null,
            },
            2: {
              state: 'ready',
              value: {
                type: 'pointseries',
                columns: {
                  x: { type: 'string', role: 'dimension', expression: 'cost' },
                  y: { type: 'string', role: 'dimension', expression: 'project' },
                  color: { type: 'string', role: 'dimension', expression: 'project' },
                },
                rows: [
                  { x: '200', y: 'tigers', color: 'tigers' },
                  { x: '500', y: 'pandas', color: 'pandas' },
                ],
              },
              error: null,
            },
          },
        },
      },
    },
  };

  const stateWithDefaultPath = {
    transient: {
      resolvedArgs: {
        'element-foo': {
          expressionContext: {
            'ast.chain': state.transient.resolvedArgs['element-foo'].expressionContext,
          },
        },
      },
    },
  };

  const expectedElement = {
    index: 2,
    context: {
      type: 'pointseries',
      columns: {
        x: { type: 'string', role: 'dimension', expression: 'cost' },
        y: { type: 'string', role: 'dimension', expression: 'project' },
        color: { type: 'string', role: 'dimension', expression: 'project' },
      },
      rows: [
        { x: '200', y: 'tigers', color: 'tigers' },
        { x: '500', y: 'pandas', color: 'pandas' },
      ],
    },
  };
  it('should find context when a previous context value is found', () => {
    // pointseries map
    expect(getSiblingContext(state, 'element-foo', 2, [])).toEqual(expectedElement);
    expect(getSiblingContext(stateWithDefaultPath, 'element-foo', 2)).toEqual(expectedElement);
    expect(getSiblingContext(stateWithDefaultPath, 'element-foo', 2, ['ast.chain'])).toEqual(
      expectedElement
    );
  });

  it('should find context when a previous context value is not found', () => {
    // pointseries map
    expect(getSiblingContext(state, 'element-foo', 1000, [])).toEqual(expectedElement);
    expect(getSiblingContext(stateWithDefaultPath, 'element-foo', 1000)).toEqual(expectedElement);
    expect(getSiblingContext(stateWithDefaultPath, 'element-foo', 1000, ['ast.chain'])).toEqual(
      expectedElement
    );
  });
});
