/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';
import type { TestRenderer } from '../../../../../../mock';

import { createAgentPolicyMock, createPackagePolicyMock } from '../../../../../../../common/mocks';
import type { AgentPolicy, NewAgentPolicy } from '../../../../../../../common/types';

import { useLicense } from '../../../../../../hooks/use_license';

import { useFleetStatus } from '../../../../hooks';

import type { LicenseService } from '../../../../../../../common/services';
import { generateNewAgentPolicyWithDefaults } from '../../../../../../../common/services';

import type { ValidationResults } from '../agent_policy_validation';

import { AgentPolicyAdvancedOptionsContent } from '.';

jest.mock('../../../../../../hooks/use_license');
jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  useFleetStatus: jest.fn(),
}));

const mockedUseLicence = useLicense as jest.MockedFunction<typeof useLicense>;
const mockedUseFleetStatus = useFleetStatus as jest.MockedFunction<typeof useFleetStatus>;

describe('Agent policy advanced options content', () => {
  let testRender: TestRenderer;
  let renderResult: RenderResult;
  let mockAgentPolicy: Partial<NewAgentPolicy | AgentPolicy>;
  const mockUpdateAgentPolicy = jest.fn();
  const mockValidation = jest.fn() as unknown as ValidationResults;
  const usePlatinumLicense = () =>
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => true,
      isPlatinum: () => true,
    } as unknown as LicenseService);
  const useSpaceAwareness = () =>
    mockedUseFleetStatus.mockReturnValue({
      isSpaceAwarenessEnabled: true,
    } as any);

  const render = ({
    isProtected = false,
    isManaged = false,
    policyId = 'agent-policy-1',
    newAgentPolicy = false,
    packagePolicy = [createPackagePolicyMock()],
    spaceIds = ['default'],
  } = {}) => {
    if (newAgentPolicy) {
      mockAgentPolicy = generateNewAgentPolicyWithDefaults();
    } else {
      mockAgentPolicy = {
        ...createAgentPolicyMock(),
        package_policies: packagePolicy,
        id: policyId,
        is_managed: isManaged,
        space_ids: spaceIds,
      };
    }

    renderResult = testRender.render(
      <AgentPolicyAdvancedOptionsContent
        agentPolicy={{
          ...mockAgentPolicy,
          is_protected: isProtected,
        }}
        updateAgentPolicy={mockUpdateAgentPolicy}
        validation={mockValidation}
      />
    );
  };

  beforeEach(() => {
    mockedUseFleetStatus.mockReturnValue({} as any);
    testRender = createFleetTestRendererMock();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Agent tamper protection toggle', () => {
    it('should be visible if license is at least platinum', () => {
      usePlatinumLicense();
      render();
      expect(renderResult.queryByTestId('tamperProtectionSwitch')).toBeInTheDocument();
    });

    it('should not be visible if license is below platinum', () => {
      mockedUseLicence.mockReturnValueOnce({
        isPlatinum: () => false,
        hasAtLeast: () => false,
      } as unknown as LicenseService);
      render();
      expect(renderResult.queryByTestId('tamperProtectionSwitch')).not.toBeInTheDocument();
    });
    it('should be visible if policy is not managed/hosted', () => {
      usePlatinumLicense();
      render({ isManaged: false });
      expect(renderResult.queryByTestId('tamperProtectionSwitch')).toBeInTheDocument();
    });
    it('should not be visible if policy is managed/hosted', () => {
      usePlatinumLicense();
      render({ isManaged: true });
      expect(renderResult.queryByTestId('tamperProtectionSwitch')).not.toBeInTheDocument();
    });
    it('switched to true enables the uninstall command link', async () => {
      usePlatinumLicense();
      render({ isProtected: true });

      expect(renderResult.getByTestId('tamperProtectionSwitch')).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(renderResult.getByTestId('uninstallCommandLink')).toBeEnabled();
    });
    it('switched to false disables the uninstall command link', () => {
      usePlatinumLicense();
      render();
      expect(renderResult.getByTestId('tamperProtectionSwitch')).toHaveAttribute(
        'aria-checked',
        'false'
      );
      expect(renderResult.getByTestId('uninstallCommandLink')).toBeDisabled();
    });
    it('when there is no policy id, the uninstall command link is not displayed', async () => {
      usePlatinumLicense();
      render({ policyId: '' });
      expect(renderResult.queryByTestId('uninstallCommandLink')).not.toBeInTheDocument();
    });
    it('should update agent policy when switched on', async () => {
      usePlatinumLicense();
      render();
      act(() => {
        renderResult.getByTestId('tamperProtectionSwitch').click();
      });
      expect(mockUpdateAgentPolicy).toHaveBeenCalledWith({ is_protected: true });
    });
    describe('when the defend integration is not installed', () => {
      beforeEach(() => {
        usePlatinumLicense();
        render({
          packagePolicy: [
            {
              ...createPackagePolicyMock(),
              package: { name: 'not-endpoint', title: 'Not Endpoint', version: '0.1.0' },
            },
          ],
          isProtected: true,
        });
      });
      it('should disable the switch and uninstall command link', () => {
        expect(renderResult.getByTestId('tamperProtectionSwitch')).toBeDisabled();
        expect(renderResult.getByTestId('uninstallCommandLink')).toBeDisabled();
      });
      it('should show an icon tip explaining why the switch is disabled', () => {
        expect(renderResult.getByTestId('tamperMissingIntegrationTooltip')).toBeTruthy();
      });
    });
    describe('when the user is creating a new agent policy', () => {
      it('should be disabled, since it has no package policies and therefore elastic defend integration is not installed', async () => {
        usePlatinumLicense();
        render({ newAgentPolicy: true });
        expect(renderResult.getByTestId('tamperProtectionSwitch')).toBeDisabled();
      });
    });
  });

  describe('Custom Fields', () => {
    it('should render the CustomFields component with correct props', () => {
      usePlatinumLicense();
      render();
      expect(renderResult.queryByText('Custom fields')).toBeInTheDocument();
      expect(renderResult.queryByText('This policy has no custom fields')).toBeInTheDocument();
    });
  });

  describe('Space selector', () => {
    beforeEach(() => {
      usePlatinumLicense();
    });

    describe('when space awareness is disabled', () => {
      it('should not be rendered', () => {
        render();
        expect(renderResult.queryByTestId('spaceSelectorInput')).not.toBeInTheDocument();
      });
    });

    describe('when space awareness is enabled', () => {
      beforeEach(() => {
        useSpaceAwareness();
      });

      describe('when the user has access to all policy spaces', () => {
        it('should render the space selection input with the Create space link', () => {
          render();
          expect(renderResult.queryByTestId('spaceSelectorInput')).toBeInTheDocument();
          expect(renderResult.queryByTestId('spaceSelectorInputLink')).toBeInTheDocument();
        });
      });

      describe('when the user does not have access to all policy spaces', () => {
        it('should render the space selection input without the Create space link', () => {
          render({ spaceIds: ['default', '?'] });
          expect(renderResult.queryByTestId('spaceSelectorInput')).toBeInTheDocument();
          expect(renderResult.queryByTestId('spaceSelectorInputLink')).not.toBeInTheDocument();
        });
      });
    });
  });
});
