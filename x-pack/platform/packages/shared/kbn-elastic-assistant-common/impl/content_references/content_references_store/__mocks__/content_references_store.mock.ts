/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentReferencesStore, Options } from '../../types';

export const newContentReferencesStoreMock: (options?: Options) => ContentReferencesStore = jest
  .fn()
  .mockImplementation((options?: Options) => ({
    add: jest.fn().mockImplementation((creator: Parameters<ContentReferencesStore['add']>[0]) => {
      return creator({ id: 'exampleContentReferenceId' });
    }),
    getStore: jest.fn().mockReturnValue({}),
    options,
  }));
