/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentReferencesStore } from '../../types';

export const newContentReferencesStoreMock: () => ContentReferencesStore = jest
  .fn()
  .mockReturnValue({
    add: jest.fn().mockImplementation((creator: Parameters<ContentReferencesStore['add']>[0]) => {
      return creator({ id: 'exampleContentReferenceId' });
    }),
    getStore: jest.fn().mockReturnValue({}),
  });
