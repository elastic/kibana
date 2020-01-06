/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
jest.mock('ui/new_platform');
import { State } from '../../../types';
import { updateEmbeddableExpression } from '../actions/embeddable';
import { embeddableReducer } from './embeddable';

const elementId = 'element-1111';
const embeddableId = '1234';
const mockWorkpadState = {
  pages: [
    {
      elements: [
        {
          id: elementId,
          expression: `function1 | function2 id="${embeddableId}" change="start value" remove="remove"`,
        },
      ],
    },
  ],
} as State['persistent']['workpad'];

describe('embeddables reducer', () => {
  it('updates the functions expression', () => {
    const updatedValue = 'updated value';

    const action = updateEmbeddableExpression({
      elementId,
      embeddableExpression: `function2 id="${embeddableId}" change="${updatedValue}" add="add"`,
    });

    const newState = embeddableReducer(mockWorkpadState, action);

    expect(newState.pages[0].elements[0].expression.replace(/\s/g, '')).toBe(
      `function1 | ${action.payload!.embeddableExpression}`.replace(/\s/g, '')
    );
  });
});
