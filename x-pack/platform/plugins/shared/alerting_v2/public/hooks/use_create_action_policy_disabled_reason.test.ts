/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useService } from '@kbn/core-di-browser';
import type { AlertingV2Feature } from '../../common/feature_privileges';
import { useCreateActionPolicyDisabledReason } from './use_create_action_policy_disabled_reason';

let mockIsLicenseValid = true;

jest.mock('@kbn/core-di-browser');
jest.mock('./use_is_action_policies_license_valid', () => ({
  useIsActionPoliciesLicenseValid: () => mockIsLicenseValid,
}));

const mockUseService = useService as jest.MockedFunction<typeof useService>;

const MISSING_PRIVILEGES_REASON = 'You do not have permission to create action policies';
const LICENSE_REQUIRED_REASON =
  'An active Enterprise license is required to create action policies.';

describe('useCreateActionPolicyDisabledReason', () => {
  it.each([
    {
      scenario:
        'returns undefined when the user can write action policies and the license is valid',
      canWriteActionPolicies: true,
      isLicenseValid: true,
      expected: undefined,
    },
    {
      scenario: 'explains missing privileges when the user cannot write action policies',
      canWriteActionPolicies: false,
      isLicenseValid: true,
      expected: MISSING_PRIVILEGES_REASON,
    },
    {
      scenario: 'explains the license requirement when the license does not allow action policies',
      canWriteActionPolicies: true,
      isLicenseValid: false,
      expected: LICENSE_REQUIRED_REASON,
    },
    {
      scenario: 'prioritizes missing privileges over the license requirement',
      canWriteActionPolicies: false,
      isLicenseValid: false,
      expected: MISSING_PRIVILEGES_REASON,
    },
  ])('$scenario', ({ canWriteActionPolicies, isLicenseValid, expected }) => {
    mockUseService.mockReturnValue({
      canWrite: (feature: AlertingV2Feature) =>
        feature === 'actionPolicies' && canWriteActionPolicies,
    });
    mockIsLicenseValid = isLicenseValid;

    const { result } = renderHook(() => useCreateActionPolicyDisabledReason());

    expect(result.current).toBe(expected);
  });
});
