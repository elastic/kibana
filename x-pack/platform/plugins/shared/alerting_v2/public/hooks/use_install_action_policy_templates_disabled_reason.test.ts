/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useService } from '@kbn/core-di-browser';
import { UserCapabilities } from '../services/user_capabilities';
import { useInstallActionPolicyTemplatesDisabledReason } from './use_install_action_policy_templates_disabled_reason';

let mockIsLicenseValid = true;

jest.mock('@kbn/core-di-browser', () => ({
  useService: jest.fn(),
  CoreStart: (key: string) => key,
}));
jest.mock('./use_is_action_policies_license_valid', () => ({
  useIsActionPoliciesLicenseValid: () => mockIsLicenseValid,
}));

const mockUseService = useService as jest.MockedFunction<typeof useService>;

const MISSING_ACTION_POLICIES_PRIVILEGES_REASON =
  'You do not have permission to create action policies';
const MISSING_WORKFLOWS_PRIVILEGES_REASON =
  'To install templates, you need permission to create and read workflows, because templates dispatch to a workflow.';
const LICENSE_REQUIRED_REASON = 'An active Enterprise license is required to install templates.';

interface Scenario {
  canWriteActionPolicies: boolean;
  workflowsCapabilities: Record<string, boolean>;
  isLicenseValid: boolean;
}

const allowed: Scenario = {
  canWriteActionPolicies: true,
  workflowsCapabilities: { createWorkflow: true, readWorkflow: true },
  isLicenseValid: true,
};

describe('useInstallActionPolicyTemplatesDisabledReason', () => {
  const scenarios: Array<{
    scenario: string;
    overrides: Partial<Scenario>;
    expected: string | undefined;
  }> = [
    {
      scenario: 'returns undefined when every requirement is met',
      overrides: {},
      expected: undefined,
    },
    {
      scenario: 'explains missing action policies privileges',
      overrides: { canWriteActionPolicies: false },
      expected: MISSING_ACTION_POLICIES_PRIVILEGES_REASON,
    },
    {
      scenario: 'explains missing workflow create privilege',
      overrides: { workflowsCapabilities: { createWorkflow: false, readWorkflow: true } },
      expected: MISSING_WORKFLOWS_PRIVILEGES_REASON,
    },
    {
      scenario: 'explains missing workflow read privilege',
      overrides: { workflowsCapabilities: { createWorkflow: true, readWorkflow: false } },
      expected: MISSING_WORKFLOWS_PRIVILEGES_REASON,
    },
    {
      scenario: 'explains the license requirement',
      overrides: { isLicenseValid: false },
      expected: LICENSE_REQUIRED_REASON,
    },
    {
      scenario: 'prioritizes missing privileges over the license requirement',
      overrides: { workflowsCapabilities: {}, isLicenseValid: false },
      expected: MISSING_WORKFLOWS_PRIVILEGES_REASON,
    },
  ];

  it.each(scenarios)('$scenario', ({ overrides, expected }) => {
    const { canWriteActionPolicies, workflowsCapabilities, isLicenseValid }: Scenario = {
      ...allowed,
      ...overrides,
    };
    mockUseService.mockImplementation((token: unknown) =>
      token === UserCapabilities
        ? { canWrite: () => canWriteActionPolicies }
        : { capabilities: { workflowsManagement: workflowsCapabilities } }
    );
    mockIsLicenseValid = isLicenseValid;

    const { result } = renderHook(() => useInstallActionPolicyTemplatesDisabledReason());

    expect(result.current).toBe(expected);
  });
});
