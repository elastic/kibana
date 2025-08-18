/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { act, waitFor } from '@testing-library/react';

import type { TestRenderer } from '../../../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../../../mock';
import type { PackageInfo } from '../../../../../types';

import { sendGetPackagePolicies, useConfig } from '../../../../../hooks';

import { SelectedPolicyTab } from '../../components';

import { useOnSubmit } from './form';

type MockFn = jest.MockedFunction<any>;

jest.mock('../../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../../hooks'),
    sendGetPackagePolicies: jest.fn().mockReturnValue({
      data: {
        items: [{ name: 'nginx-1' }, { name: 'other-policy' }],
      },
      isLoading: false,
    }),
    useFleetStatus: jest.fn().mockReturnValue({ isReady: true } as any),
    sendGetStatus: jest
      .fn()
      .mockResolvedValue({ data: { isReady: true, missing_requirements: [] } }),
    useConfig: jest.fn(),
  };
});

describe('useOnSubmit', () => {
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

  let testRenderer: TestRenderer;
  let renderResult: RenderHookResult<
    ReturnType<typeof useOnSubmit>,
    Parameters<typeof useOnSubmit>
  >;
  const render = async ({ isUpdate } = { isUpdate: false }) => {
    renderResult = testRenderer.renderHook(() =>
      useOnSubmit({
        agentCount: 0,
        packageInfo,
        withSysMonitoring: false,
        selectedPolicyTab: SelectedPolicyTab.NEW,
        newAgentPolicy: { name: 'test', namespace: '' },
        queryParamsPolicyId: undefined,
        hasFleetAddAgentsPrivileges: true,
        setNewAgentPolicy: jest.fn(),
        setSelectedPolicyTab: jest.fn(),
      })
    );

    await waitFor(() => new Promise((resolve) => resolve(null)));

    return renderResult;
  };

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
    (useConfig as MockFn).mockReturnValue({
      agentless: undefined,
    } as any);
  });

  describe('default API response', () => {
    beforeEach(async () => {
      await render();
    });

    it('should set new values when package policy changes', () => {
      act(() => {
        renderResult.result.current.updatePackagePolicy({
          id: 'new-id',
          namespace: 'newspace',
          name: 'apache-2',
        });
      });

      expect(renderResult.result.current.packagePolicy).toEqual({
        id: 'new-id',
        policy_ids: [],
        namespace: 'newspace',
        description: '',
        enabled: true,
        inputs: [],
        name: 'apache-2',
        package: {
          name: 'apache',
          title: 'Apache',
          version: '1.0.0',
        },
        vars: {
          'Advanced var': {
            type: 'bool',
            value: true,
          },
          'Required var': {
            type: 'bool',
            value: undefined,
          },
          'Show user var': {
            type: 'string',
            value: 'showUserVarVal',
          },
        },
      });
    });

    it('should set index 1 name to package policy on init if no package policies exist for this package', () => {
      // waitFor(() => {
      //   expect(renderResult.getByDisplayValue('apache-1')).toBeInTheDocument();
      //   expect(renderResult.getByDisplayValue('desc')).toBeInTheDocument();
      // });

      expect(renderResult.result.current.packagePolicy).toEqual({
        description: '',
        enabled: true,
        inputs: [],
        name: 'apache-1',
        namespace: '',
        policy_ids: [],
        package: {
          name: 'apache',
          title: 'Apache',
          version: '1.0.0',
        },
        vars: {
          'Advanced var': {
            type: 'bool',
            value: true,
          },
          'Required var': {
            type: 'bool',
            value: undefined,
          },
          'Show user var': {
            type: 'string',
            value: 'showUserVarVal',
          },
        },
      });
    });
  });

  it('should set incremented name if other package policies exist', async () => {
    (sendGetPackagePolicies as jest.MockedFunction<any>).mockReturnValue({
      data: {
        items: [
          { name: 'apache-1' },
          { name: 'apache-2' },
          { name: 'apache-9' },
          { name: 'apache-10' },
        ],
      },
      isLoading: false,
    });

    await render();

    expect(renderResult.result.current.packagePolicy).toEqual({
      description: '',
      enabled: true,
      inputs: [],
      name: 'apache-11',
      namespace: '',
      policy_ids: [],
      package: {
        name: 'apache',
        title: 'Apache',
        version: '1.0.0',
      },
      vars: {
        'Advanced var': {
          type: 'bool',
          value: true,
        },
        'Required var': {
          type: 'bool',
          value: undefined,
        },
        'Show user var': {
          type: 'string',
          value: 'showUserVarVal',
        },
      },
    });
  });

  describe('input deployment mode filtering', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should disable inputs that are not allowed for agentless deployment mode', async () => {
      // Mock packageInfo with inputs that have deployment_modes
      const packageInfoWithInputs: PackageInfo = {
        ...packageInfo,
        policy_templates: [
          {
            name: 'test_template',
            title: 'Test Template',
            description: 'Test template',
            deployment_modes: {
              default: { enabled: true },
              agentless: { enabled: true },
            },
            inputs: [
              {
                type: 'logs',
                title: 'Logs',
                description: 'Log collection',
                deployment_modes: ['default', 'agentless'],
              },
              {
                type: 'metrics',
                title: 'Metrics',
                description: 'Metrics collection',
                deployment_modes: ['default'],
              },
              {
                type: 'http_endpoint',
                title: 'HTTP Endpoint',
                description: 'HTTP endpoint',
                deployment_modes: ['agentless'],
              },
            ],
          },
        ],
      };

      // Mock useConfig to return agentless configuration
      (useConfig as MockFn).mockReturnValue({
        agentless: { enabled: true },
      } as any);

      // Render the hook with a package policy that has inputs including metrics
      renderResult = testRenderer.renderHook(() =>
        useOnSubmit({
          agentCount: 0,
          packageInfo: packageInfoWithInputs,
          withSysMonitoring: false,
          selectedPolicyTab: SelectedPolicyTab.NEW,
          newAgentPolicy: { name: 'test', namespace: '', supports_agentless: true },
          queryParamsPolicyId: undefined,
          hasFleetAddAgentsPrivileges: true,
          setNewAgentPolicy: jest.fn(),
          setSelectedPolicyTab: jest.fn(),
        })
      );

      await waitFor(() => new Promise((resolve) => resolve(null)));
      act(() => {
        // Simulate switching to agentless setup technology
        renderResult.result.current.handleSetupTechnologyChange('agentless' as any);
      });

      await waitFor(() => {
        const { packagePolicy } = renderResult.result.current;
        const logsInput = packagePolicy.inputs.find((input: any) => input.type === 'logs');
        const metricsInput = packagePolicy.inputs.find((input: any) => input.type === 'metrics');
        const httpInput = packagePolicy.inputs.find((input: any) => input.type === 'http_endpoint');

        // Expect logs and http_endpoint to be enabled, and metrics to be disabled
        expect(logsInput?.enabled).toBe(true);
        expect(httpInput?.enabled).toBe(true);
        expect(metricsInput?.enabled).toBe(false);
      });
    });

    it('should enable all inputs for default deployment mode', async () => {
      // Mock packageInfo with inputs
      const packageInfoWithInputs: PackageInfo = {
        ...packageInfo,
        policy_templates: [
          {
            name: 'test_template',
            title: 'Test Template',
            description: 'Test template',
            deployment_modes: {
              default: { enabled: true },
              agentless: { enabled: true },
            },
            inputs: [
              {
                type: 'logs',
                title: 'Logs',
                description: 'Log collection',
                deployment_modes: ['default', 'agentless'],
              },
              {
                type: 'metrics',
                title: 'Metrics',
                description: 'Metrics collection',
                deployment_modes: ['default'],
              },
            ],
          },
        ],
      };

      // Mock useConfig to return regular configuration
      (useConfig as MockFn).mockReturnValue({
        agentless: undefined,
      } as any);

      // Render the hook with regular agent policy
      renderResult = testRenderer.renderHook(() =>
        useOnSubmit({
          agentCount: 0,
          packageInfo: packageInfoWithInputs,
          withSysMonitoring: false,
          selectedPolicyTab: SelectedPolicyTab.NEW,
          newAgentPolicy: { name: 'test', namespace: '' },
          queryParamsPolicyId: undefined,
          hasFleetAddAgentsPrivileges: true,
          setNewAgentPolicy: jest.fn(),
          setSelectedPolicyTab: jest.fn(),
        })
      );

      await waitFor(() => new Promise((resolve) => resolve(null)));
      await waitFor(() => {
        const { packagePolicy } = renderResult.result.current;
        const logsInput = packagePolicy.inputs.find((input: any) => input.type === 'logs');
        const metricsInput = packagePolicy.inputs.find((input: any) => input.type === 'metrics');

        // Both inputs should remain enabled for default mode
        expect(logsInput?.enabled).toBe(true);
        expect(metricsInput?.enabled).toBe(true);
      });
    });
  });
});
