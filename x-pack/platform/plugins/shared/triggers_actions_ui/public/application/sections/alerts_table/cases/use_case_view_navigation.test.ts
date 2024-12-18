/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { act, waitFor, renderHook } from '@testing-library/react';
import { useKibana } from '../../../../common/lib/kibana';
import { AppMockRenderer, createAppMockRenderer } from '../../test_utils';
import { useCaseViewNavigation } from './use_case_view_navigation';

jest.mock('../../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useCaseViewNavigation', () => {
  let appMockRender: AppMockRenderer;
  const navigateToApp = jest.fn();

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    useKibanaMock().services.application.currentAppId$ = new BehaviorSubject<string>('testAppId');
    useKibanaMock().services.application.navigateToApp = navigateToApp;
  });

  it('calls navigateToApp with correct arguments', async () => {
    const { result } = renderHook(() => useCaseViewNavigation(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.navigateToCaseView({ caseId: 'test-id' });
    });

    await waitFor(() => {
      expect(navigateToApp).toHaveBeenCalledWith('testAppId', {
        deepLinkId: 'cases',
        path: '/test-id',
      });
    });
  });

  it('calls navigateToApp with correct arguments and bypass current app id', async () => {
    const { result } = renderHook(() => useCaseViewNavigation('superAppId'), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.navigateToCaseView({ caseId: 'test-id' });
    });

    await waitFor(() => {
      expect(navigateToApp).toHaveBeenCalledWith('superAppId', {
        deepLinkId: 'cases',
        path: '/test-id',
      });
    });
  });
});
