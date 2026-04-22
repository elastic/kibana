/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { BehaviorSubject, type Observable } from 'rxjs';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { CoreStart } from '@kbn/core/public';
import type { PublicAppInfo } from '@kbn/core/public';
import { useAgentBuilderAnnouncementChromeScope } from './use_agent_builder_announcement_chrome_scope';

function createMockCore({
  solutionNavId,
  currentAppId,
  apps,
}: {
  solutionNavId: string | null;
  currentAppId: string | undefined;
  apps: Map<string, PublicAppInfo>;
}): CoreStart {
  const solutionNavId$ = new BehaviorSubject(solutionNavId);
  const currentAppId$ = new BehaviorSubject(currentAppId);
  const applications$ = new BehaviorSubject<ReadonlyMap<string, PublicAppInfo>>(apps);

  return {
    chrome: {
      getActiveSolutionNavId$: () => solutionNavId$ as Observable<string | null>,
      getActiveSolutionNavId: () => solutionNavId$.getValue(),
    },
    application: {
      currentAppId$: currentAppId$ as Observable<string | undefined>,
      applications$: applications$ as Observable<ReadonlyMap<string, PublicAppInfo>>,
    },
  } as unknown as CoreStart;
}

describe('useAgentBuilderAnnouncementChromeScope', () => {
  it('is true for observability project navigation', () => {
    const core = createMockCore({
      solutionNavId: 'oblt',
      currentAppId: 'discover',
      apps: new Map(),
    });
    const { result } = renderHook(() => useAgentBuilderAnnouncementChromeScope(core));
    expect(result.current).toBe(true);
  });

  it('is true for security project navigation', () => {
    const core = createMockCore({
      solutionNavId: 'security',
      currentAppId: 'discover',
      apps: new Map(),
    });
    const { result } = renderHook(() => useAgentBuilderAnnouncementChromeScope(core));
    expect(result.current).toBe(true);
  });

  it('is false for search project navigation', () => {
    const core = createMockCore({
      solutionNavId: 'es',
      currentAppId: 'discover',
      apps: new Map(),
    });
    const { result } = renderHook(() => useAgentBuilderAnnouncementChromeScope(core));
    expect(result.current).toBe(false);
  });

  it('uses app category when no project solution is active', () => {
    const core = createMockCore({
      solutionNavId: null,
      currentAppId: 'apm',
      apps: new Map([
        [
          'apm',
          {
            id: 'apm',
            title: 'APM',
            category: DEFAULT_APP_CATEGORIES.observability,
          } as PublicAppInfo,
        ],
      ]),
    });
    const { result } = renderHook(() => useAgentBuilderAnnouncementChromeScope(core));
    expect(result.current).toBe(true);
  });

  it('is true for streams app id despite management category', () => {
    const core = createMockCore({
      solutionNavId: null,
      currentAppId: 'streams',
      apps: new Map([
        [
          'streams',
          {
            id: 'streams',
            title: 'Streams',
            category: DEFAULT_APP_CATEGORIES.management,
          } as PublicAppInfo,
        ],
      ]),
    });
    const { result } = renderHook(() => useAgentBuilderAnnouncementChromeScope(core));
    expect(result.current).toBe(true);
  });
});
