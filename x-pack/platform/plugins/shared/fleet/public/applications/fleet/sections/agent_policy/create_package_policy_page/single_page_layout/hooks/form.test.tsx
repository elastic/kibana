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

  describe('agentless disabled-input auto-enable', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should auto-enable a single disabled input when switching to agentless deployment mode', async () => {
      // Single-input agentless package whose stream has enabled:false in the spec.
      // The simplified UX shows no toggle, so the input must be auto-enabled so that
      // configuration fields are visible and the integration can actually be deployed.
      const packageInfoWithDisabledInputs: PackageInfo = {
        ...packageInfo,
        data_streams: [
          {
            type: 'logs',
            dataset: 'test.access',
            path: 'access',
            release: 'ga',
            package: 'apache',
            ingest_pipeline: 'default',
            title: 'Apache access logs',
            streams: [
              {
                input: 'logfile',
                enabled: false,
                vars: [],
              },
            ],
          },
        ] as any,
        policy_templates: [
          {
            name: 'apache',
            title: 'Apache',
            description: 'Apache integration',
            deployment_modes: {
              default: { enabled: true },
              agentless: { enabled: true },
            },
            inputs: [
              {
                type: 'logfile',
                title: 'Log files',
                description: 'Collect Apache log files',
              },
            ],
          },
        ],
      };

      (useConfig as MockFn).mockReturnValue({
        agentless: { enabled: true },
      } as any);

      renderResult = testRenderer.renderHook(() =>
        useOnSubmit({
          agentCount: 0,
          packageInfo: packageInfoWithDisabledInputs,
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

      // Verify input starts disabled (stream has enabled:false in spec)
      await waitFor(() => {
        const { packagePolicy } = renderResult.result.current;
        const logfileInput = packagePolicy.inputs.find((input: any) => input.type === 'logfile');
        expect(logfileInput?.enabled).toBe(false);
      });

      act(() => {
        renderResult.result.current.handleSetupTechnologyChange('agentless' as any);
      });

      await waitFor(() => {
        const { packagePolicy } = renderResult.result.current;
        const logfileInput = packagePolicy.inputs.find((input: any) => input.type === 'logfile');
        // Single agentless input should be auto-enabled so config fields are visible
        expect(logfileInput?.enabled).toBe(true);
        expect(logfileInput?.streams.every((s: any) => s.enabled)).toBe(true);
      });
    });

    it('should not auto-enable disabled inputs for multi-input agentless packages', async () => {
      // Multi-input package: the user should be able to choose which inputs to enable,
      // so we must not blindly enable everything when switching to agentless.
      const packageInfoMultiInput: PackageInfo = {
        ...packageInfo,
        data_streams: [
          {
            type: 'logs',
            dataset: 'test.access',
            path: 'access',
            release: 'ga',
            package: 'apache',
            ingest_pipeline: 'default',
            title: 'Apache access logs',
            streams: [{ input: 'logfile', enabled: false, vars: [] }],
          },
          {
            type: 'metrics',
            dataset: 'test.metrics',
            path: 'metrics',
            release: 'ga',
            package: 'apache',
            ingest_pipeline: 'default',
            title: 'Apache metrics',
            streams: [{ input: 'apache/metrics', enabled: false, vars: [] }],
          },
        ] as any,
        policy_templates: [
          {
            name: 'apache',
            title: 'Apache',
            description: 'Apache integration',
            deployment_modes: {
              default: { enabled: true },
              agentless: { enabled: true },
            },
            inputs: [
              {
                type: 'logfile',
                title: 'Log files',
                description: 'Collect Apache log files',
              },
              {
                type: 'apache/metrics',
                title: 'Metrics',
                description: 'Collect Apache metrics',
              },
            ],
          },
        ],
      };

      (useConfig as MockFn).mockReturnValue({
        agentless: { enabled: true },
      } as any);

      renderResult = testRenderer.renderHook(() =>
        useOnSubmit({
          agentCount: 0,
          packageInfo: packageInfoMultiInput,
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
        renderResult.result.current.handleSetupTechnologyChange('agentless' as any);
      });

      await waitFor(() => {
        const { packagePolicy } = renderResult.result.current;
        const logfileInput = packagePolicy.inputs.find((input: any) => input.type === 'logfile');
        const metricsInput = packagePolicy.inputs.find(
          (input: any) => input.type === 'apache/metrics'
        );
        // Multi-input packages are not auto-enabled; user must enable them explicitly
        expect(logfileInput?.enabled).toBe(false);
        expect(metricsInput?.enabled).toBe(false);
      });
    });
  });
});
