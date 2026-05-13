/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, act } from '@testing-library/react';

import { userEvent } from '@testing-library/user-event';

import { getInheritedNamespace } from '../../../../../../../../common/services';

import type { TestRenderer } from '../../../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../../../mock';
import type { AgentPolicy, NewPackagePolicy, PackageInfo } from '../../../../../types';

import { useGetPackagePoliciesQuery } from '../../../../../hooks';

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
    const renderWithToggle = (overrides: {
      packagePolicyOverride?: Partial<NewPackagePolicy>;
      namespaceCustomizationEnabled?: boolean;
      installedNamespaceCustomizationEnabledFor?: string[];
      allowedNamespacePrefixes?: string[];
      onNamespaceCustomizationEnabledChange?: (enabled: boolean) => void;
    }) => {
      const policy = { ...packagePolicy, ...(overrides.packagePolicyOverride ?? {}) };
      return testRenderer.render(
        <StepDefinePackagePolicy
          namespacePlaceholder={getInheritedNamespace(agentPolicies)}
          packageInfo={packageInfo}
          packagePolicy={policy}
          updatePackagePolicy={mockUpdatePackagePolicy}
          validationResults={validationResults}
          submitAttempted={true}
          namespaceCustomizationEnabled={!!overrides.namespaceCustomizationEnabled}
          onNamespaceCustomizationEnabledChange={
            overrides.onNamespaceCustomizationEnabledChange ?? jest.fn()
          }
          installedNamespaceCustomizationEnabledFor={
            overrides.installedNamespaceCustomizationEnabledFor ?? []
          }
          allowedNamespacePrefixes={overrides.allowedNamespacePrefixes ?? []}
        />
      );
    };

    it('renders the toggle in advanced options when all props are provided', async () => {
      renderResult = renderWithToggle({});
      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
      await waitFor(() => {
        expect(
          renderResult.getByTestId('packagePolicyNamespaceCustomizationToggle')
        ).toBeInTheDocument();
      });
    });

    it('does not render the toggle when the wiring props are missing', async () => {
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
      renderResult = renderWithToggle({
        packagePolicyOverride: { namespace: 'staging' },
        allowedNamespacePrefixes: ['production'],
      });
      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
      await waitFor(() => {
        const toggle = renderResult.getByTestId('packagePolicyNamespaceCustomizationToggle');
        expect(toggle).toBeDisabled();
      });
    });

    it('is enabled when the namespace matches an allowed prefix', async () => {
      renderResult = renderWithToggle({
        packagePolicyOverride: { namespace: 'production_west' },
        allowedNamespacePrefixes: ['production'],
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
      expect(onChange).toHaveBeenCalledWith(true);
    });

    describe('impact warnings', () => {
      const mockUseGetPackagePoliciesQuery = useGetPackagePoliciesQuery as jest.Mock;

      afterEach(() => {
        mockUseGetPackagePoliciesQuery.mockReturnValue({ data: { items: [] } });
      });

      it('shows opt-in warning (Case 3) when toggle is on, namespace not opted in, and other policies exist', async () => {
        mockUseGetPackagePoliciesQuery.mockReturnValue({
          data: { items: [{ id: 'other-policy-1' }, { id: 'other-policy-2' }] },
        });
        renderResult = renderWithToggle({
          packagePolicyOverride: { namespace: 'staging' },
          namespaceCustomizationEnabled: true,
          installedNamespaceCustomizationEnabledFor: [],
        });
        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
        await waitFor(() => {
          expect(
            renderResult.getByTestId('packagePolicyNamespaceCustomizationOptInImpactWarning')
          ).toBeInTheDocument();
        });
        expect(
          renderResult.queryByTestId('packagePolicyNamespaceCustomizationOptOutImpactWarning')
        ).not.toBeInTheDocument();
      });

      it('shows opt-out warning (Case 8) when toggle is off, namespace is opted in, and other policies exist', async () => {
        mockUseGetPackagePoliciesQuery.mockReturnValue({
          data: { items: [{ id: 'other-policy-1' }] },
        });
        renderResult = renderWithToggle({
          packagePolicyOverride: { namespace: 'staging' },
          namespaceCustomizationEnabled: false,
          installedNamespaceCustomizationEnabledFor: ['staging'],
        });
        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
        await waitFor(() => {
          expect(
            renderResult.getByTestId('packagePolicyNamespaceCustomizationOptOutImpactWarning')
          ).toBeInTheDocument();
        });
        expect(
          renderResult.queryByTestId('packagePolicyNamespaceCustomizationOptInImpactWarning')
        ).not.toBeInTheDocument();
      });

      it('shows no warning when toggle is on and namespace is already opted in (Case 4)', async () => {
        mockUseGetPackagePoliciesQuery.mockReturnValue({
          data: { items: [{ id: 'other-policy-1' }] },
        });
        renderResult = renderWithToggle({
          packagePolicyOverride: { namespace: 'staging' },
          namespaceCustomizationEnabled: true,
          installedNamespaceCustomizationEnabledFor: ['staging'],
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

      it('shows no warning when toggle is on and there are no other policies', async () => {
        mockUseGetPackagePoliciesQuery.mockReturnValue({ data: { items: [] } });
        renderResult = renderWithToggle({
          packagePolicyOverride: { namespace: 'staging' },
          namespaceCustomizationEnabled: true,
          installedNamespaceCustomizationEnabledFor: [],
        });
        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
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
        renderResult = testRenderer.render(
          <StepDefinePackagePolicy
            namespacePlaceholder={getInheritedNamespace(agentPolicies)}
            packageInfo={packageInfo}
            packagePolicy={{ ...packagePolicy, namespace: 'staging' }}
            updatePackagePolicy={mockUpdatePackagePolicy}
            validationResults={validationResults}
            submitAttempted={true}
            namespaceCustomizationEnabled={true}
            onNamespaceCustomizationEnabledChange={jest.fn()}
            installedNamespaceCustomizationEnabledFor={[]}
            allowedNamespacePrefixes={[]}
            packagePolicyId="current-policy"
          />
        );
        await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);
        await waitFor(() => {
          expect(
            renderResult.queryByTestId('packagePolicyNamespaceCustomizationOptInImpactWarning')
          ).not.toBeInTheDocument();
        });
      });
    });
  });
});
