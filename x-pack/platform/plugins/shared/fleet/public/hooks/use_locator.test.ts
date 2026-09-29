/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { OBSERVABILITY_RULE_LIBRARY_HOST } from '@kbn/alerting-v2-utils';

import { useStartServices } from './use_core';
import { useAlertingV2RuleLibraryLocator } from './use_locator';

jest.mock('./use_core');

const mockUseStartServices = useStartServices as jest.MockedFunction<typeof useStartServices>;

const createLocator = () => ({
  getRedirectUrl: jest.fn(({ templateId, host }: { templateId?: string; host?: { app: string } }) =>
    host
      ? `/app/${host.app}/rule-library?templateId=${templateId}`
      : `/app/management/alertingV2/rule_library?templateId=${templateId}`
  ),
  getLocation: jest.fn(),
  getUrl: jest.fn(),
  navigate: jest.fn(),
});

const createServices = ({
  solutionNavId = null as string | null,
  projectType,
  spaceSolution,
  locator = createLocator(),
}: {
  solutionNavId?: string | null;
  projectType?: string;
  spaceSolution?: string;
  locator?: ReturnType<typeof createLocator>;
} = {}) => {
  const solutionNavId$ = new BehaviorSubject(solutionNavId);
  const space$ = new BehaviorSubject(spaceSolution ? { solution: spaceSolution } : undefined);

  mockUseStartServices.mockReturnValue({
    chrome: {
      getActiveSolutionNavId$: () => solutionNavId$,
      getActiveSolutionNavId: () => solutionNavId,
    },
    cloud: projectType ? { serverless: { projectType } } : undefined,
    spaces: {
      getActiveSpace$: () => space$,
    },
    share: {
      url: {
        locators: {
          get: () => locator,
        },
      },
    },
  } as any);

  return locator;
};

describe('useAlertingV2RuleLibraryLocator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('binds the observability host when solution nav is oblt', () => {
    const locator = createServices({ solutionNavId: 'oblt' });
    const { result } = renderHook(() => useAlertingV2RuleLibraryLocator());

    result.current?.getRedirectUrl({ templateId: 'tmpl-1' });

    expect(locator.getRedirectUrl).toHaveBeenCalledWith(
      { templateId: 'tmpl-1', host: OBSERVABILITY_RULE_LIBRARY_HOST },
      undefined
    );
  });

  it('binds the observability host when the serverless project is observability', () => {
    const locator = createServices({ projectType: 'observability' });
    const { result } = renderHook(() => useAlertingV2RuleLibraryLocator());

    result.current?.getRedirectUrl({ templateId: 'tmpl-1' });

    expect(locator.getRedirectUrl).toHaveBeenCalledWith(
      { templateId: 'tmpl-1', host: OBSERVABILITY_RULE_LIBRARY_HOST },
      undefined
    );
  });

  it('binds the observability host when the space solution is oblt', () => {
    const locator = createServices({ spaceSolution: 'oblt' });
    const { result } = renderHook(() => useAlertingV2RuleLibraryLocator());

    result.current?.getRedirectUrl({ templateId: 'tmpl-1' });

    expect(locator.getRedirectUrl).toHaveBeenCalledWith(
      { templateId: 'tmpl-1', host: OBSERVABILITY_RULE_LIBRARY_HOST },
      undefined
    );
  });

  it('leaves the locator unbound so management is used for other solutions', () => {
    const locator = createServices({ solutionNavId: 'security', projectType: 'security' });
    const { result } = renderHook(() => useAlertingV2RuleLibraryLocator());

    result.current?.getRedirectUrl({ templateId: 'tmpl-1' });

    expect(locator.getRedirectUrl).toHaveBeenCalledWith({ templateId: 'tmpl-1' });
  });

  it('leaves the locator unbound in classic nav', () => {
    const locator = createServices({ solutionNavId: null, spaceSolution: 'classic' });
    const { result } = renderHook(() => useAlertingV2RuleLibraryLocator());

    result.current?.getRedirectUrl({ templateId: 'tmpl-1' });

    expect(locator.getRedirectUrl).toHaveBeenCalledWith({ templateId: 'tmpl-1' });
  });
});
