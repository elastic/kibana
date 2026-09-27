/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { Subject } from 'rxjs';
import { useService } from '@kbn/core-di-browser';
import type { ILicense, LicenseType } from '@kbn/licensing-types';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { useIsActionPoliciesLicenseValid } from './use_is_action_policies_license_valid';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;

const createLicense = (type: LicenseType, status: 'active' | 'expired' = 'active'): ILicense =>
  licensingMock.createLicense({ license: { type, status } });

const renderWithLicense$ = (license$: Subject<ILicense>) => {
  mockUseService.mockReturnValue({ license$ });
  return renderHook(() => useIsActionPoliciesLicenseValid());
};

describe('useIsActionPoliciesLicenseValid', () => {
  it('returns true until the license is known', () => {
    const { result } = renderWithLicense$(new Subject<ILicense>());

    expect(result.current).toBe(true);
  });

  it.each<LicenseType>(['enterprise', 'trial'])('returns true for an active %s license', (type) => {
    const license$ = new Subject<ILicense>();
    const { result } = renderWithLicense$(license$);

    act(() => license$.next(createLicense(type)));

    expect(result.current).toBe(true);
  });

  it.each<LicenseType>(['basic', 'standard', 'gold', 'platinum'])(
    'returns false for an active %s license',
    (type) => {
      const license$ = new Subject<ILicense>();
      const { result } = renderWithLicense$(license$);

      act(() => license$.next(createLicense(type)));

      expect(result.current).toBe(false);
    }
  );

  it('returns false for an expired enterprise license', () => {
    const license$ = new Subject<ILicense>();
    const { result } = renderWithLicense$(license$);

    act(() => license$.next(createLicense('enterprise', 'expired')));

    expect(result.current).toBe(false);
  });

  it('reacts to license changes', () => {
    const license$ = new Subject<ILicense>();
    const { result } = renderWithLicense$(license$);

    act(() => license$.next(createLicense('enterprise')));
    expect(result.current).toBe(true);

    act(() => license$.next(createLicense('basic')));
    expect(result.current).toBe(false);
  });
});
