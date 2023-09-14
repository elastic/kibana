/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useGetAppUrl, useNavigateTo } from './navigation';
import { mockGetUrlForApp, mockNavigateToApp, mockNavigateToUrl } from '../mocks/context';
import { renderHook } from '@testing-library/react-hooks';

jest.mock('./context');

const URL = '/the/mocked/url';
mockGetUrlForApp.mockReturnValue(URL);

describe('yourFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useGetAppUrl', () => {
    it('returns the correct app URL', () => {
      const { result } = renderHook(useGetAppUrl);
      const { getAppUrl } = result.current;

      const appUrl = getAppUrl({ appId: 'testAppId', path: 'testPath', absolute: false });

      expect(appUrl).toEqual(URL);

      expect(mockGetUrlForApp).toHaveBeenCalledWith('testAppId', {
        path: 'testPath',
        absolute: false,
      });
    });
  });

  describe('useNavigateTo', () => {
    it('navigates to the app URL', () => {
      const { result } = renderHook(useNavigateTo);
      const { navigateTo } = result.current;

      // Call the navigateTo function with test parameters
      navigateTo({ appId: 'testAppId', deepLinkId: 'someId', path: 'testPath' });

      // Verify dependencies were called with correct parameters
      expect(mockNavigateToApp).toHaveBeenCalledWith('testAppId', {
        deepLinkId: 'someId',
        path: 'testPath',
      });
      expect(mockNavigateToUrl).not.toHaveBeenCalled();
    });

    it('navigates to the provided URL', () => {
      const { result } = renderHook(useNavigateTo);
      const { navigateTo } = result.current;

      // Call the navigateTo function with test parameters
      navigateTo({ url: URL });

      // Verify dependencies were called with correct parameters
      expect(mockNavigateToApp).not.toHaveBeenCalled();
      expect(mockNavigateToUrl).toHaveBeenCalledWith(URL);
    });
  });
});
