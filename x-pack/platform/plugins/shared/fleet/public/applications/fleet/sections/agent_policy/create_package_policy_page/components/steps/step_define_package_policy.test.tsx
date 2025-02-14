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

import { StepDefinePackagePolicy } from './step_define_package_policy';

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
        expect(renderResult.getByTestId('comboBoxSearchInput')).toHaveAttribute(
          'placeholder',
          'ns'
        );
      });
    });

    it(`should fallback to the default namespace when namespace is not set in package policy and there's no agent policy`, async () => {
      packagePolicy.namespace = '';
      act(() => {
        render(getInheritedNamespace([]));
      });

      await userEvent.click(renderResult.getByText('Advanced options').closest('button')!);

      await waitFor(() => {
        expect(renderResult.getByTestId('comboBoxSearchInput')).toHaveAttribute(
          'placeholder',
          'default'
        );
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
});
