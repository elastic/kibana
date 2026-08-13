/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, act, fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { useSpaceSettingsContext } from '../../../../../../../hooks/use_space_settings_context';
import { getInheritedNamespace } from '../../../../../../../../common/services';

import type { TestRenderer } from '../../../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../../../mock';
import type { AgentPolicy, NewPackagePolicy, PackageInfo } from '../../../../../types';

import { useGetPackagePoliciesQuery, useGetIlmPoliciesQuery } from '../../../../../hooks';

import { StepDefinePackagePolicy } from './step_define_package_policy';

jest.mock('./components/hooks', () => ({
  ...jest.requireActual('./components/hooks'),
  useOutputs: jest.fn().mockReturnValue({
    isLoading: false,
    canUseOutputPerIntegration: true,
    allowedOutputs: [{ id: 'output-1', name: 'Default output', type: 'elasticsearch' }],
  }),
}));

jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  useGetPackagePoliciesQuery: jest.fn().mockReturnValue({ data: { items: [] } }),
  useGetIlmPoliciesQuery: jest.fn().mockReturnValue({
    data: { has_manage_ilm: true, items: ['policy-a', 'policy-b'] },
    isLoading: false,
  }),
}));

jest.mock('../../../../../../../hooks/use_space_settings_context', () => ({
  ...jest.requireActual('../../../../../../../hooks/use_space_settings_context'),
  useSpaceSettingsContext: jest.fn().mockReturnValue({
    allowedNamespacePrefixes: [],
    defaultNamespace: 'default',
  }),
}));

describe('StepDefinePackagePolicy', () => {
  const packageInfo: PackageInfo = {
    name: 'apache',
    version: '1.0.0',
    description: '',
    format_version: '',
    release: 'ga',
    owner: { github: '' },
    title: 'Apache',
    latestVersion: '',
    assets: {} as any,
    status: 'not_installed',
    vars: [
      {
        show_user: true,
        name: 'Show user var',
        type: 'string',
        default: 'showUserVarVal',
      },
      {
        required: true,
        name: 'Required var',
        type: 'bool',
      },
      {
        name: 'Advanced var',
        type: 'bool',
        default: true,
      },
    ],
  };
  const agentPolicies: AgentPolicy[] = [
    {
      id: 'agent-policy-1',
      namespace: 'ns',
      name: 'Agent policy 1',
      is_managed: false,
      status: 'active',
      updated_at: '',
      updated_by: '',
      revision: 1,
      package_policies: [],
      is_protected: false,
    },
  ];
  let packagePolicy: NewPackagePolicy;
  const mockUpdatePackagePolicy = jest.fn().mockImplementation((val: any) => {
    packagePolicy = {
      ...val,
      ...packagePolicy,
    };
  });

  const validationResults = {
    name: null,
    description: null,
    additional_datastreams_permissions: null,
    namespace: null,
    condition: null,
    inputs: {},
    vars: {
      'Required var': ['Required var is required'],
    },
  };

  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;

  const render = (namespacePlaceholder = getInheritedNamespace(agentPolicies)) =>
    (renderResult = testRenderer.render(
      <StepDefinePackagePolicy
        namespacePlaceholder={namespacePlaceholder}
        packageInfo={packageInfo}
        packagePolicy={packagePolicy}
        updatePackagePolicy={mockUpdatePackagePolicy}
        validationResults={validationResults}
        submitAttempted={true}
      />
    ));

  beforeEach(() => {
    packagePolicy = {
      name: '',
      description: 'desc',
      namespace: 'package-policy-ns',
      enabled: true,
      policy_id: '',
      policy_ids: [''],
      package: {
        name: 'apache',
        title: 'Apache',
        version: '1.0.0',
      },
      inputs: [],
      vars: {
        'Show user var': {
          type: 'string',
          value: 'showUserVarVal',
        },
        'Required var': {
          type: 'bool',
          value: undefined,
        },
        'Advanced var': {
          type: 'bool',
          value: true,
        },
      },
    };
    testRenderer = createFleetTestRendererMock();
  });

  describe('default API response', () => {
    it('should display vars coming from package policy', async () => {
      act(() => {
        render();
      });
      expect(renderResult.getByDisplayValue('showUserVarVal')).toBeInTheDocument();
      expect(renderResult.getByRole('switch', { name: 'Required var' })).toBeInTheDocument();
      expect(renderResult.queryByRole('switch', { name: 'Advanced var' })).not.toBeInTheDocument();

      expect(renderResult.getByText('Required var is required')).toHaveClass('euiFormErrorText');

      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);

      await waitFor(() => {
        expect(renderResult.getByRole('switch', { name: 'Advanced var' })).toBeInTheDocument();
        expect(renderResult.getByTestId('packagePolicyNamespaceInput')).toHaveTextContent(
          'package-policy-ns'
        );
      });
    });

    it(`should display namespace from agent policy when there's no package policy namespace`, async () => {
      packagePolicy.namespace = '';
      act(() => {
        render();
      });

      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);

      await waitFor(() => {
        expect(
          renderResult.getByTestId('packagePolicyNamespaceInput').querySelector('input')
        ).toHaveAttribute('placeholder', 'ns');
      });
    });

    it(`should fallback to the default namespace when namespace is not set in package policy and there's no agent policy`, async () => {
      packagePolicy.namespace = '';
      act(() => {
        render(getInheritedNamespace([]));
      });

      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);

      await waitFor(() => {
        expect(
          renderResult.getByTestId('packagePolicyNamespaceInput').querySelector('input')
        ).toHaveAttribute('placeholder', 'default');
      });
    });
  });

  describe('update', () => {
    describe('when package vars are introduced in a new package version', () => {
      it('should display new package vars', async () => {
        act(() => {
          render();
        });
        expect(renderResult.getByDisplayValue('showUserVarVal')).toBeInTheDocument();
        expect(renderResult.getByText('Required var')).toBeInTheDocument();

        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);

        await waitFor(async () => {
          expect(renderResult.getByText('Advanced var')).toBeInTheDocument();
        });
      });
    });
  });

  describe('loading state', () => {
    it('should render Loading component when validationResults is undefined', () => {
      renderResult = testRenderer.render(
        <StepDefinePackagePolicy
          packageInfo={packageInfo}
          packagePolicy={packagePolicy}
          updatePackagePolicy={mockUpdatePackagePolicy}
          validationResults={undefined}
          submitAttempted={false}
        />
      );

      expect(renderResult.getByTestId('loadingSpinner')).toBeInTheDocument();
      expect(renderResult.queryByTestId('packagePolicyNameInput')).not.toBeInTheDocument();
    });
  });

  describe('managed policy', () => {
    it('should display managed policy callout when is_managed is true', () => {
      packagePolicy.is_managed = true;

      act(() => {
        render();
      });

      expect(
        renderResult.getByText('This is a managed package policy. You cannot modify it here.')
      ).toBeInTheDocument();
    });

    it('should make name field read-only when is_managed is true', () => {
      packagePolicy.is_managed = true;

      act(() => {
        render();
      });

      const nameInput = renderResult.getByTestId('packagePolicyNameInput');
      expect(nameInput).toHaveAttribute('readonly');
    });

    it('should make description field read-only when is_managed is true', () => {
      packagePolicy.is_managed = true;

      act(() => {
        render();
      });

      const descriptionInput = renderResult.getByTestId('packagePolicyDescriptionInput');
      expect(descriptionInput).toHaveAttribute('readonly');
    });

    it('should not show advanced options toggle when is_managed is true', () => {
      packagePolicy.is_managed = true;

      act(() => {
        render();
      });

      expect(renderResult.queryByText('Advanced options')).not.toBeInTheDocument();
    });

    it('should not disable output selector when is_managed is false', () => {
      // noAdvancedToggle=true forces the advanced section open so the output field renders
      renderResult = testRenderer.render(
        <StepDefinePackagePolicy
          namespacePlaceholder={getInheritedNamespace(agentPolicies)}
          packageInfo={packageInfo}
          packagePolicy={{ ...packagePolicy, is_managed: false }}
          updatePackagePolicy={mockUpdatePackagePolicy}
          validationResults={validationResults}
          submitAttempted={false}
          noAdvancedToggle={true}
        />
      );
      expect(renderResult.getByTestId('packagePolicyOutputInput')).not.toBeDisabled();
    });

    it('should disable output selector when packagePolicy.is_managed is true', () => {
      // noAdvancedToggle=true forces the advanced section open so the output field renders
      renderResult = testRenderer.render(
        <StepDefinePackagePolicy
          namespacePlaceholder={getInheritedNamespace(agentPolicies)}
          packageInfo={packageInfo}
          packagePolicy={{ ...packagePolicy, is_managed: true }}
          updatePackagePolicy={mockUpdatePackagePolicy}
          validationResults={validationResults}
          submitAttempted={false}
          noAdvancedToggle={true}
        />
      );
      expect(renderResult.getByTestId('packagePolicyOutputInput')).toBeDisabled();
    });

    it('should disable output selector when parent agent policy is managed', () => {
      const managedAgentPolicies: AgentPolicy[] = [{ ...agentPolicies[0], is_managed: true }];
      renderResult = testRenderer.render(
        <StepDefinePackagePolicy
          namespacePlaceholder={getInheritedNamespace(managedAgentPolicies)}
          packageInfo={packageInfo}
          packagePolicy={packagePolicy}
          updatePackagePolicy={mockUpdatePackagePolicy}
          validationResults={validationResults}
          submitAttempted={false}
          noAdvancedToggle={true}
          agentPolicies={managedAgentPolicies}
        />
      );
      expect(renderResult.getByTestId('packagePolicyOutputInput')).toBeDisabled();
    });
  });

  describe('additional datastreams permissions', () => {
    it('should render the permissions combo box in advanced options', async () => {
      act(() => {
        render();
      });

      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);

      await waitFor(() => {
        expect(renderResult.getByText('Add a reroute processor permission')).toBeInTheDocument();
      });
    });

    it('should display validation errors for additional_datastreams_permissions', async () => {
      const validationResultsWithError = {
        ...validationResults,
        additional_datastreams_permissions: ['Invalid permission format'],
      };

      renderResult = testRenderer.render(
        <StepDefinePackagePolicy
          packageInfo={packageInfo}
          packagePolicy={packagePolicy}
          updatePackagePolicy={mockUpdatePackagePolicy}
          validationResults={validationResultsWithError}
          submitAttempted={true}
        />
      );

      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);

      await waitFor(() => {
        expect(renderResult.getByText('Invalid permission format')).toBeInTheDocument();
      });
    });
  });

  describe('integration-level condition field', () => {
    const renderWithCondition = (
      policyOverrides: Record<string, unknown> = {},
      propOverrides: Record<string, unknown> = {}
    ) =>
      (renderResult = testRenderer.render(
        <StepDefinePackagePolicy
          namespacePlaceholder={getInheritedNamespace(agentPolicies)}
          packageInfo={packageInfo}
          packagePolicy={{ ...packagePolicy, ...policyOverrides }}
          updatePackagePolicy={mockUpdatePackagePolicy}
          validationResults={validationResults}
          submitAttempted={false}
          {...propOverrides}
        />
      ));

    it('shows condition field in advanced options for a normal integration', async () => {
      act(() => {
        renderWithCondition();
      });
      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
      await waitFor(() => {
        expect(renderResult.getByTestId('packagePolicyConditionInput')).toBeInTheDocument();
      });
    });

    it('hides condition field for agentless policy', async () => {
      act(() => {
        renderWithCondition({ supports_agentless: true }, { isAgentlessSelected: true });
      });
      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
      await waitFor(() => {
        expect(renderResult.queryByTestId('packagePolicyConditionInput')).not.toBeInTheDocument();
      });
    });

    it('hides condition field on edit page of an agentless policy', async () => {
      act(() => {
        renderWithCondition({ supports_agentless: true }, { isEditPage: true });
      });
      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
      await waitFor(() => {
        expect(renderResult.queryByTestId('packagePolicyConditionInput')).not.toBeInTheDocument();
      });
    });

    it('hides condition field when all inputs are otelcol', async () => {
      act(() => {
        renderWithCondition({
          inputs: [{ enabled: true, type: 'otelcol', streams: [], policy_template: 'test' }],
        });
      });
      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
      await waitFor(() => {
        expect(renderResult.queryByTestId('packagePolicyConditionInput')).not.toBeInTheDocument();
      });
    });

    it('calls updatePackagePolicy with condition value on change', async () => {
      act(() => {
        renderWithCondition();
      });
      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
      await waitFor(() => {
        expect(renderResult.getByTestId('packagePolicyConditionInput')).toBeInTheDocument();
      });
      fireEvent.change(renderResult.getByTestId('packagePolicyConditionInput'), {
        target: { value: "host.os.type == 'linux'" },
      });
      expect(mockUpdatePackagePolicy).toHaveBeenCalledWith(
        expect.objectContaining({ condition: "host.os.type == 'linux'" })
      );
    });
  });

  describe('var group selections state management', () => {
    const packageInfoWithVarGroups: PackageInfo = {
      ...packageInfo,
      var_groups: [
        {
          name: 'auth_method',
          title: 'Authentication',
          selector_title: 'Select method',
          options: [
            { name: 'api_key', title: 'API Key', vars: ['api_key_var'] },
            { name: 'basic', title: 'Basic Auth', vars: ['username_var', 'password_var'] },
          ],
        },
      ],
    };

    it('should use var_group_selections from policy', () => {
      const policyWithSelections = {
        ...packagePolicy,
        var_group_selections: { auth_method: 'basic' },
      };

      renderResult = testRenderer.render(
        <StepDefinePackagePolicy
          packageInfo={packageInfoWithVarGroups}
          packagePolicy={policyWithSelections}
          updatePackagePolicy={mockUpdatePackagePolicy}
          validationResults={validationResults}
          submitAttempted={false}
        />
      );

      const selector = renderResult.queryByTestId('varGroupSelector-auth_method');
      if (selector) {
        expect(selector).toHaveValue('basic');
      }
    });

    it('should update policy var_group_selections when selection changes', async () => {
      const policyWithSelections = {
        ...packagePolicy,
        var_group_selections: { auth_method: 'api_key' },
      };

      renderResult = testRenderer.render(
        <StepDefinePackagePolicy
          packageInfo={packageInfoWithVarGroups}
          packagePolicy={policyWithSelections}
          updatePackagePolicy={mockUpdatePackagePolicy}
          validationResults={validationResults}
          submitAttempted={false}
        />
      );

      const selector = renderResult.queryByTestId('varGroupSelector-auth_method');
      if (selector) {
        await userEvent.selectOptions(selector, 'basic');

        expect(mockUpdatePackagePolicy).toHaveBeenCalledWith({
          var_group_selections: { auth_method: 'basic' },
        });
      }
    });
  });

  describe('namespace customization toggle', () => {
    const mockUseSpaceSettingsContext = useSpaceSettingsContext as jest.Mock;

    const renderWithToggle = (overrides: {
      packagePolicyOverride?: Partial<NewPackagePolicy>;
      packageInfoOverride?: Partial<PackageInfo>;
      onNamespaceCustomizationEnabledChange?: (enabled: boolean, isInit?: boolean) => void;
      packagePolicyId?: string;
    }) => {
      const policy = { ...packagePolicy, ...(overrides.packagePolicyOverride ?? {}) };
      const info = { ...packageInfo, ...(overrides.packageInfoOverride ?? {}) } as PackageInfo;
      return testRenderer.render(
        <StepDefinePackagePolicy
          namespacePlaceholder={getInheritedNamespace(agentPolicies)}
          packageInfo={info}
          packagePolicy={policy}
          updatePackagePolicy={mockUpdatePackagePolicy}
          validationResults={validationResults}
          submitAttempted={true}
          onNamespaceCustomizationEnabledChange={
            overrides.onNamespaceCustomizationEnabledChange ?? jest.fn()
          }
          packagePolicyId={overrides.packagePolicyId}
        />
      );
    };

    beforeEach(() => {
      mockUseSpaceSettingsContext.mockReturnValue({
        allowedNamespacePrefixes: [],
        defaultNamespace: 'default',
      });
    });

    it('renders the toggle in advanced options when onNamespaceCustomizationEnabledChange is provided', async () => {
      renderResult = renderWithToggle({});
      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
      await waitFor(() => {
        expect(
          renderResult.getByTestId('packagePolicyNamespaceCustomizationToggle')
        ).toBeInTheDocument();
      });
    });

    it('does not render the toggle when onNamespaceCustomizationEnabledChange is not provided', async () => {
      renderResult = testRenderer.render(
        <StepDefinePackagePolicy
          namespacePlaceholder={getInheritedNamespace(agentPolicies)}
          packageInfo={packageInfo}
          packagePolicy={packagePolicy}
          updatePackagePolicy={mockUpdatePackagePolicy}
          validationResults={validationResults}
          submitAttempted={true}
        />
      );
      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
      await waitFor(() => {
        expect(
          renderResult.queryByTestId('packagePolicyNamespaceCustomizationToggle')
        ).not.toBeInTheDocument();
      });
    });

    it('is disabled when the namespace fails prefix validation', async () => {
      mockUseSpaceSettingsContext.mockReturnValue({
        allowedNamespacePrefixes: ['production'],
        defaultNamespace: 'production',
      });
      renderResult = renderWithToggle({
        packagePolicyOverride: { namespace: 'staging' },
      });
      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
      await waitFor(() => {
        const toggle = renderResult.getByTestId('packagePolicyNamespaceCustomizationToggle');
        expect(toggle).toBeDisabled();
      });
    });

    it('is enabled when the namespace matches an allowed prefix', async () => {
      mockUseSpaceSettingsContext.mockReturnValue({
        allowedNamespacePrefixes: ['production'],
        defaultNamespace: 'production',
      });
      renderResult = renderWithToggle({
        packagePolicyOverride: { namespace: 'production_west' },
      });
      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
      await waitFor(() => {
        const toggle = renderResult.getByTestId('packagePolicyNamespaceCustomizationToggle');
        expect(toggle).not.toBeDisabled();
      });
    });

    it('calls onNamespaceCustomizationEnabledChange when toggled', async () => {
      const onChange = jest.fn();
      renderResult = renderWithToggle({
        packagePolicyOverride: { namespace: 'staging' },
        onNamespaceCustomizationEnabledChange: onChange,
      });
      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
      const toggle = await renderResult.findByTestId('packagePolicyNamespaceCustomizationToggle');
      await userEvent.click(toggle);
      // The last call should be the user's toggle (no isInit flag), not the init call.
      expect(onChange).toHaveBeenLastCalledWith(true);
    });

    it('calls onNamespaceCustomizationEnabledChange with isInit=true when namespace is already opted in', async () => {
      const onChange = jest.fn();
      renderResult = renderWithToggle({
        packagePolicyOverride: { namespace: 'staging' },
        packageInfoOverride: {
          installationInfo: {
            namespace_customization_enabled_for: ['staging'],
          } as any,
        },
        onNamespaceCustomizationEnabledChange: onChange,
      });
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(true, true);
      });
    });

    describe('impact warnings', () => {
      const mockUseGetPackagePoliciesQuery = useGetPackagePoliciesQuery as jest.Mock;

      afterEach(() => {
        mockUseGetPackagePoliciesQuery.mockReturnValue({ data: { items: [] } });
      });

      it('shows opt-in warning when toggle is turned on, namespace not opted in, and other policies exist', async () => {
        mockUseGetPackagePoliciesQuery.mockReturnValue({
          data: { items: [{ id: 'other-policy-1' }, { id: 'other-policy-2' }] },
        });
        // packageInfo has no installationInfo → namespace not opted in → toggle starts OFF
        renderResult = renderWithToggle({
          packagePolicyOverride: { namespace: 'staging' },
        });
        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
        const toggle = await renderResult.findByTestId('packagePolicyNamespaceCustomizationToggle');
        await userEvent.click(toggle); // turn ON
        await waitFor(() => {
          expect(
            renderResult.getByTestId('packagePolicyNamespaceCustomizationOptInImpactWarning')
          ).toBeInTheDocument();
        });
        expect(
          renderResult.queryByTestId('packagePolicyNamespaceCustomizationOptOutImpactWarning')
        ).not.toBeInTheDocument();
      });

      it('shows opt-out warning when toggle is turned off, namespace is opted in, and other policies exist', async () => {
        mockUseGetPackagePoliciesQuery.mockReturnValue({
          data: { items: [{ id: 'other-policy-1' }] },
        });
        // installationInfo includes 'staging' → toggle initializes to ON
        renderResult = renderWithToggle({
          packagePolicyOverride: { namespace: 'staging' },
          packageInfoOverride: {
            installationInfo: {
              namespace_customization_enabled_for: ['staging'],
            } as any,
          },
        });
        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
        const toggle = await renderResult.findByTestId('packagePolicyNamespaceCustomizationToggle');
        await userEvent.click(toggle); // turn OFF
        await waitFor(() => {
          expect(
            renderResult.getByTestId('packagePolicyNamespaceCustomizationOptOutImpactWarning')
          ).toBeInTheDocument();
        });
        expect(
          renderResult.queryByTestId('packagePolicyNamespaceCustomizationOptInImpactWarning')
        ).not.toBeInTheDocument();
      });

      it('shows no warning when namespace is already opted in and toggle stays on', async () => {
        mockUseGetPackagePoliciesQuery.mockReturnValue({
          data: { items: [{ id: 'other-policy-1' }] },
        });
        // installationInfo includes 'staging' → toggle initializes to ON → isOptedIn true → no warning
        renderResult = renderWithToggle({
          packagePolicyOverride: { namespace: 'staging' },
          packageInfoOverride: {
            installationInfo: {
              namespace_customization_enabled_for: ['staging'],
            } as any,
          },
        });
        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
        await waitFor(() => {
          expect(
            renderResult.queryByTestId('packagePolicyNamespaceCustomizationOptInImpactWarning')
          ).not.toBeInTheDocument();
          expect(
            renderResult.queryByTestId('packagePolicyNamespaceCustomizationOptOutImpactWarning')
          ).not.toBeInTheDocument();
        });
      });

      it('shows no warning when toggle is turned on but there are no other policies', async () => {
        mockUseGetPackagePoliciesQuery.mockReturnValue({ data: { items: [] } });
        renderResult = renderWithToggle({
          packagePolicyOverride: { namespace: 'staging' },
        });
        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
        const toggle = await renderResult.findByTestId('packagePolicyNamespaceCustomizationToggle');
        await userEvent.click(toggle); // turn ON
        await waitFor(() => {
          expect(
            renderResult.queryByTestId('packagePolicyNamespaceCustomizationOptInImpactWarning')
          ).not.toBeInTheDocument();
        });
      });

      it('excludes the current policy id from the other-policies count', async () => {
        mockUseGetPackagePoliciesQuery.mockReturnValue({
          data: { items: [{ id: 'current-policy' }] },
        });
        renderResult = renderWithToggle({
          packagePolicyOverride: { namespace: 'staging' },
          packagePolicyId: 'current-policy',
        });
        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
        const toggle = await renderResult.findByTestId('packagePolicyNamespaceCustomizationToggle');
        await userEvent.click(toggle); // turn ON
        await waitFor(() => {
          expect(
            renderResult.queryByTestId('packagePolicyNamespaceCustomizationOptInImpactWarning')
          ).not.toBeInTheDocument();
        });
      });
    });

    describe('ILM policy picker', () => {
      const mockUseGetIlmPoliciesQuery = useGetIlmPoliciesQuery as jest.Mock;

      afterEach(() => {
        mockUseGetIlmPoliciesQuery.mockReturnValue({
          data: { has_manage_ilm: true, items: ['policy-a', 'policy-b'] },
          isLoading: false,
        });
      });

      it('is disabled with a tooltip when namespace customization is not enabled', async () => {
        renderResult = renderWithToggle({
          packagePolicyOverride: { namespace: 'staging' },
        });
        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
        await waitFor(() => {
          expect(renderResult.getByTestId('packagePolicyIlmPolicySelect')).toBeDisabled();
        });
      });

      it('becomes enabled as soon as the toggle is switched on, before the policy is saved', async () => {
        // Regression test: the picker must not wait for the server-confirmed opt-in
        // (installationInfo.namespace_customization_enabled_for), which is only updated after
        // save — otherwise it's impossible to pick an ILM policy while creating a new policy.
        renderResult = renderWithToggle({
          packagePolicyOverride: { namespace: 'staging' },
        });
        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
        const toggle = await renderResult.findByTestId('packagePolicyNamespaceCustomizationToggle');
        await userEvent.click(toggle); // turn ON, not yet saved/opted in on the server
        await waitFor(() => {
          expect(renderResult.getByTestId('packagePolicyIlmPolicySelect')).not.toBeDisabled();
        });
      });

      it('is disabled when the caller lacks the manage_ilm privilege, even if enabled', async () => {
        mockUseGetIlmPoliciesQuery.mockReturnValue({
          data: { has_manage_ilm: false, items: [] },
          isLoading: false,
        });
        renderResult = renderWithToggle({
          packagePolicyOverride: { namespace: 'staging' },
          packageInfoOverride: {
            installationInfo: {
              namespace_customization_enabled_for: ['staging'],
            } as any,
          },
        });
        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
        await waitFor(() => {
          expect(renderResult.getByTestId('packagePolicyIlmPolicySelect')).toBeDisabled();
        });
      });

      it('calls onIlmPolicyChange when a policy is selected', async () => {
        const onIlmPolicyChange = jest.fn();
        renderResult = testRenderer.render(
          <StepDefinePackagePolicy
            namespacePlaceholder={getInheritedNamespace(agentPolicies)}
            packageInfo={packageInfo}
            packagePolicy={{ ...packagePolicy, namespace: 'staging' }}
            updatePackagePolicy={mockUpdatePackagePolicy}
            validationResults={validationResults}
            submitAttempted={true}
            onNamespaceCustomizationEnabledChange={jest.fn()}
            onIlmPolicyChange={onIlmPolicyChange}
          />
        );
        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
        const toggle = await renderResult.findByTestId('packagePolicyNamespaceCustomizationToggle');
        await userEvent.click(toggle);
        const select = await renderResult.findByTestId('packagePolicyIlmPolicySelect');
        await waitFor(() => expect(select).not.toBeDisabled());
        fireEvent.change(select, { target: { value: 'policy-a' } });
        expect(onIlmPolicyChange).toHaveBeenLastCalledWith('policy-a');
      });

      it('resets the selected ILM policy and calls onIlmPolicyChange(undefined) when toggle is turned off', async () => {
        const onIlmPolicyChange = jest.fn();
        renderResult = testRenderer.render(
          <StepDefinePackagePolicy
            namespacePlaceholder={getInheritedNamespace(agentPolicies)}
            packageInfo={packageInfo}
            packagePolicy={{ ...packagePolicy, namespace: 'staging' }}
            updatePackagePolicy={mockUpdatePackagePolicy}
            validationResults={validationResults}
            submitAttempted={true}
            onNamespaceCustomizationEnabledChange={jest.fn()}
            onIlmPolicyChange={onIlmPolicyChange}
          />
        );
        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
        const toggle = await renderResult.findByTestId('packagePolicyNamespaceCustomizationToggle');
        await userEvent.click(toggle); // turn ON
        const select = await renderResult.findByTestId('packagePolicyIlmPolicySelect');
        await waitFor(() => expect(select).not.toBeDisabled());
        fireEvent.change(select, { target: { value: 'policy-a' } });
        expect(onIlmPolicyChange).toHaveBeenLastCalledWith('policy-a');
        await userEvent.click(toggle); // turn OFF
        expect(onIlmPolicyChange).toHaveBeenLastCalledWith(undefined);
        await waitFor(() => expect(select).toHaveValue(''));
      });

      it('keeps the currently assigned ilm_policy selectable even if excluded from the fetched list', async () => {
        renderResult = renderWithToggle({
          packagePolicyOverride: { namespace: 'staging' },
          packageInfoOverride: {
            installationInfo: {
              namespace_customization_enabled_for: ['staging'],
              namespace_customization_settings: { staging: { ilm_policy: 'deleted-policy' } },
            } as any,
          },
        });
        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
        const select = await renderResult.findByTestId('packagePolicyIlmPolicySelect');
        await waitFor(() => expect(select).toHaveValue('deleted-policy'));
      });
    });
  });
});
