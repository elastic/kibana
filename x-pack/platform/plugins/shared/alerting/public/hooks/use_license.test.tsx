/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { renderHook } from '@testing-library/react';
import { useLicense } from './use_license';
import { AppMockRenderer, createAppMockRenderer } from '../lib/test_utils';

let appMockRenderer: AppMockRenderer;

describe('useLicense', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAtLeastPlatinum', () => {
    it('returns true on a valid platinum license', () => {
      const license = licensingMock.createLicense({
        license: { type: 'platinum' },
      });
      appMockRenderer = createAppMockRenderer({ license });

      const { result } = renderHook(
        () => {
          return useLicense();
        },
        {
          wrapper: appMockRenderer.AppWrapper,
        }
      );

      expect(result.current.isAtLeastPlatinum()).toBeTruthy();
    });

    it('returns false on a valid gold license', () => {
      const license = licensingMock.createLicense({
        license: { type: 'gold' },
      });
      appMockRenderer = createAppMockRenderer({ license });

      const { result } = renderHook(
        () => {
          return useLicense();
        },
        { wrapper: appMockRenderer.AppWrapper }
      );

      expect(result.current.isAtLeastPlatinum()).toBeFalsy();
    });
  });
});
