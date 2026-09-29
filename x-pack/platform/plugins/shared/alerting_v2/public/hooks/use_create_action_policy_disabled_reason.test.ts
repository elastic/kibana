/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIsActionPoliciesLicenseValid } from './use_is_action_policies_license_valid';
import { useCreateActionPolicyDisabledReason } from './use_create_action_policy_disabled_reason';

let mockActionPoliciesCapabilities = { read: true, all: true };

jest.mock('@kbn/core-di-browser', () => {
  const { UserCapabilities: ActualUserCapabilities } = jest.requireActual(
    '../services/user_capabilities'
  );
  return {
    useService: (token: unknown) =>
      token === ActualUserCapabilities
        ? new ActualUserCapabilities({
            capabilities: { alerting_v2_action_policies: mockActionPoliciesCapabilities },
          })
        : {},
    CoreStart: (key: string) => key,
  };
});

jest.mock('./use_is_action_policies_license_valid', () => ({
  useIsActionPoliciesLicenseValid: jest.fn(),
}));

const mockUseIsActionPoliciesLicenseValid = jest.mocked(useIsActionPoliciesLicenseValid);

const MISSING_PRIVILEGES_REASON = 'You do not have permission to create action policies';
const LICENSE_REQUIRED_REASON =
  'An active Enterprise license is required to create action policies.';

const renderDisabledReason = ({
  canWriteActionPolicies,
  isLicenseValid,
}: {
  canWriteActionPolicies: boolean;
  isLicenseValid: boolean;
}) => {
  mockActionPoliciesCapabilities = { read: true, all: canWriteActionPolicies };
  mockUseIsActionPoliciesLicenseValid.mockReturnValue(isLicenseValid);
  return renderHook(() => useCreateActionPolicyDisabledReason());
};

describe('useCreateActionPolicyDisabledReason', () => {
  it('returns undefined when the user can write action policies and the license is valid', () => {
    const { result } = renderDisabledReason({ canWriteActionPolicies: true, isLicenseValid: true });

    expect(result.current).toBeUndefined();
  });

  it('explains missing privileges when the user cannot write action policies', () => {
    const { result } = renderDisabledReason({
      canWriteActionPolicies: false,
      isLicenseValid: true,
    });

    expect(result.current).toBe(MISSING_PRIVILEGES_REASON);
  });

  it('explains the license requirement when the license does not allow action policies', () => {
    const { result } = renderDisabledReason({
      canWriteActionPolicies: true,
      isLicenseValid: false,
    });

    expect(result.current).toBe(LICENSE_REQUIRED_REASON);
  });

  it('prioritizes missing privileges over the license requirement', () => {
    const { result } = renderDisabledReason({
      canWriteActionPolicies: false,
      isLicenseValid: false,
    });

    expect(result.current).toBe(MISSING_PRIVILEGES_REASON);
  });
});
