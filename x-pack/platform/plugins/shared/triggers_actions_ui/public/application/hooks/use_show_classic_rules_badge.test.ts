/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { act, renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import type { SolutionId } from '@kbn/core-chrome-browser';
import { useKibana } from '../../common/lib/kibana';
import { useShowClassicRulesBadge } from './use_show_classic_rules_badge';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const mockServices = ({
  solutionNavId$,
  canReadV2Rules = true,
}: {
  solutionNavId$: BehaviorSubject<SolutionId | null>;
  canReadV2Rules?: boolean;
}) => {
  const core = coreMock.createStart();
  core.settings.globalClient.isDeclared.mockReturnValue(true);
  core.settings.globalClient.get.mockReturnValue(true);
  core.application.capabilities = {
    ...core.application.capabilities,
    ...(canReadV2Rules ? { alerting_v2_rules: { read: true } } : {}),
  };
  core.chrome.getActiveSolutionNavId$.mockReturnValue(solutionNavId$);
  core.chrome.getActiveSolutionNavId.mockReturnValue(solutionNavId$.getValue());

  useKibanaMock.mockReturnValue({ services: core } as unknown as ReturnType<typeof useKibana>);
};

describe('useShowClassicRulesBadge', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns true in Observability when the user can reach v2 rules', () => {
    mockServices({ solutionNavId$: new BehaviorSubject<SolutionId | null>('oblt') });

    const { result } = renderHook(() => useShowClassicRulesBadge());

    expect(result.current).toBe(true);
  });

  it.each<[SolutionId]>([['security'], ['es']])(
    'returns false in the %s solution',
    (solutionNavId) => {
      mockServices({ solutionNavId$: new BehaviorSubject<SolutionId | null>(solutionNavId) });

      const { result } = renderHook(() => useShowClassicRulesBadge());

      expect(result.current).toBe(false);
    }
  );

  it('returns false when the user cannot reach v2 rules', () => {
    mockServices({
      solutionNavId$: new BehaviorSubject<SolutionId | null>('oblt'),
      canReadV2Rules: false,
    });

    const { result } = renderHook(() => useShowClassicRulesBadge());

    expect(result.current).toBe(false);
  });

  it('updates when the active solution changes', () => {
    const solutionNavId$ = new BehaviorSubject<SolutionId | null>('oblt');
    mockServices({ solutionNavId$ });

    const { result } = renderHook(() => useShowClassicRulesBadge());
    expect(result.current).toBe(true);

    act(() => solutionNavId$.next('security'));

    expect(result.current).toBe(false);
  });
});
