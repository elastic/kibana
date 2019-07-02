/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DragContextState } from '../drag_drop';

export function createMockedDragDropContext(): jest.Mocked<DragContextState> {
  return {
    dragging: undefined,
    setDragging: jest.fn(),
  };
}

jest.mock('ui/new_platform');

jest.mock('ui/storage', () => {
  return {
    Storage: jest.fn().mockImplementation(() => ({
      get: jest.fn(),
      getItem: jest.fn(),
    })),
  };
});

jest.mock('../../../../../../src/legacy/core_plugins/data/public/setup', () => ({
  data: {
    query: {
      ui: {
        QueryBarInput: jest.fn(),
      },
    },
  },
}));
