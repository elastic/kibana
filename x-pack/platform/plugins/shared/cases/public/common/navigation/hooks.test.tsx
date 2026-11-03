/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { renderHook, act } from '@testing-library/react';

import { APP_ID } from '../../../common/constants';
import { useNavigation } from '../lib/kibana';
import { TestProviders } from '../mock';
import {
  useCasesNavigation,
  useAllCasesNavigation,
  useCreateCaseNavigation,
  useConfigureCasesNavigation,
  useCaseViewNavigation,
} from './hooks';
import { CasesDeepLinkId } from './deep_links';
import * as topLevelApp from '../top_level_app';

const useNavigationMock = useNavigation as jest.Mock;
jest.mock('../lib/kibana');

const navigateTo = jest.fn();
const getAppUrl = jest.fn();

describe('hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigationMock.mockReturnValue({ navigateTo, getAppUrl });
  });

  describe('useCasesNavigation', () => {
    it('it calls getAppUrl with correct arguments', () => {
      const { result } = renderHook(
        () => useCasesNavigation({ deepLinkId: CasesDeepLinkId.cases }),
        {
          wrapper: ({ children }: React.PropsWithChildren<{}>) => (
            <TestProviders>{children}</TestProviders>
          ),
        }
      );

      const [getCasesUrl] = result.current;

      act(() => {
        getCasesUrl(false);
      });

      expect(getAppUrl).toHaveBeenCalledWith({ absolute: false, deepLinkId: APP_ID });
    });

    it('it calls navigateToAllCases with correct arguments', () => {
      const { result } = renderHook(
        () => useCasesNavigation({ deepLinkId: CasesDeepLinkId.cases }),
        {
          wrapper: ({ children }: React.PropsWithChildren<{}>) => (
            <TestProviders>{children}</TestProviders>
          ),
        }
      );
      const [, navigateToCases] = result.current;

      act(() => {
        navigateToCases();
      });

      expect(navigateTo).toHaveBeenCalledWith({ deepLinkId: APP_ID });
    });
  });

  describe('useAllCasesNavigation', () => {
    it('it calls getAppUrl with correct arguments', () => {
      const { result } = renderHook(() => useAllCasesNavigation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      });

      act(() => {
        result.current.getAllCasesUrl(false);
      });

      expect(getAppUrl).toHaveBeenCalledWith({ absolute: false, path: '/', deepLinkId: APP_ID });
    });

    it('it calls navigateToAllCases with correct arguments', () => {
      const { result } = renderHook(() => useAllCasesNavigation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      });

      act(() => {
        result.current.navigateToAllCases();
      });

      expect(navigateTo).toHaveBeenCalledWith({ path: '/', deepLinkId: APP_ID });
    });
  });

  describe('useCreateCaseNavigation', () => {
    it('it calls getAppUrl with correct arguments', () => {
      const { result } = renderHook(() => useCreateCaseNavigation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      });

      act(() => {
        result.current.getCreateCaseUrl(false);
      });

      expect(getAppUrl).toHaveBeenCalledWith({
        absolute: false,
        path: '/create',
        deepLinkId: APP_ID,
      });
    });

    it('it calls navigateToAllCases with correct arguments', () => {
      const { result } = renderHook(() => useCreateCaseNavigation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      });

      act(() => {
        result.current.navigateToCreateCase();
      });

      expect(navigateTo).toHaveBeenCalledWith({ deepLinkId: APP_ID, path: '/create' });
    });
  });

  describe('useConfigureCasesNavigation', () => {
    it('it calls getAppUrl with correct arguments', () => {
      const { result } = renderHook(() => useConfigureCasesNavigation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      });

      act(() => {
        result.current.getConfigureCasesUrl(false);
      });

      expect(getAppUrl).toHaveBeenCalledWith({
        absolute: false,
        path: '/configure',
        deepLinkId: APP_ID,
      });
    });

    it('it calls navigateToAllCases with correct arguments', () => {
      const { result } = renderHook(() => useConfigureCasesNavigation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      });

      act(() => {
        result.current.navigateToConfigureCases();
      });

      expect(navigateTo).toHaveBeenCalledWith({ path: '/configure', deepLinkId: APP_ID });
    });
  });

  describe('useCaseViewNavigation', () => {
    it('it calls getAppUrl with correct arguments', () => {
      const { result } = renderHook(() => useCaseViewNavigation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      });

      act(() => {
        result.current.getCaseViewUrl({ detailName: 'test' }, false);
      });

      expect(getAppUrl).toHaveBeenCalledWith({
        absolute: false,
        deepLinkId: APP_ID,
        path: '/test',
      });
    });

    it('it calls navigateToAllCases with correct arguments', () => {
      const { result } = renderHook(() => useCaseViewNavigation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      });

      act(() => {
        result.current.navigateToCaseView({ detailName: 'test' });
      });

      expect(navigateTo).toHaveBeenCalledWith({ deepLinkId: APP_ID, path: '/test' });
    });
  });

  describe('with the top-level Cases app', () => {
    beforeEach(() => {
      jest.spyOn(topLevelApp, 'isTopLevelAppEnabled').mockReturnValue(true);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('navigates to the cases app whatever app is current', () => {
      const { result } = renderHook(() => useCaseViewNavigation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      });

      act(() => {
        result.current.navigateToCaseView({ detailName: 'test' });
      });

      expect(useNavigationMock).toHaveBeenCalledWith('cases');
      expect(navigateTo).toHaveBeenCalledWith({ deepLinkId: undefined, path: '/test' });
    });

    it('builds list URLs without the host app deep link', () => {
      const { result } = renderHook(() => useAllCasesNavigation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders>{children}</TestProviders>
        ),
      });

      act(() => {
        result.current.getAllCasesUrl(false);
      });

      expect(useNavigationMock).toHaveBeenCalledWith('cases');
      expect(getAppUrl).toHaveBeenCalledWith({ absolute: false, deepLinkId: undefined, path: '/' });
    });
  });
});
