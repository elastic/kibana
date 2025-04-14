/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';

import { useApplicationCapabilities } from './hooks';
import { allCasesPermissions, TestProviders } from '../../mock';

describe('hooks', () => {
  describe('useApplicationCapabilities', () => {
    it('should return the correct capabilities', async () => {
      const { result } = renderHook(() => useApplicationCapabilities(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current).toEqual({
        actions: { crud: true, read: true },
        generalCasesV3: allCasesPermissions(),
        visualize: { crud: true, read: true },
        dashboard: { crud: true, read: true },
      });
    });
  });
});
