/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';

import { TestProviders } from './mock';
import { useIsMainApplication } from './hooks';
import { useApplication } from './lib/kibana/use_application';

jest.mock('./lib/kibana/use_application');

const useApplicationMock = useApplication as jest.Mock;

describe('hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useIsMainApplication', () => {
    beforeEach(() => {
      useApplicationMock.mockReturnValue({ appId: 'management', appTitle: 'Management' });
    });

    it('returns true if it is the main application', () => {
      const { result } = renderHook(() => useIsMainApplication(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      });

      expect(result.current).toBe(true);
    });

    it('returns false if it is not the main application', () => {
      useApplicationMock.mockReturnValue({ appId: 'testAppId', appTitle: 'Test app' });

      const { result } = renderHook(() => useIsMainApplication(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      });

      expect(result.current).toBe(false);
    });
  });
});
