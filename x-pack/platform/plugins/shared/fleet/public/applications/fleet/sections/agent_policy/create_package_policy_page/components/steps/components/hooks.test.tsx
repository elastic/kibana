/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook, act } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../../../mock';
import type { MockedFleetStartServices } from '../../../../../../../../mock';
import { useLicense } from '../../../../../../../../hooks/use_license';
import type { LicenseService } from '../../../../../../services';
import type { PackagePolicy } from '../../../../../../../../../common/types';
import type { RegistryVarGroup } from '../../../../../../types';

import { useOutputs, useVarGroupSelections } from './hooks';

jest.mock('../../../../../../../../hooks/use_license');

const mockedUseLicence = useLicense as jest.MockedFunction<typeof useLicense>;

function defaultHttpClientGetImplementation(path: any) {
  if (typeof path !== 'string') {
    throw new Error('Invalid request');
  }
  const err = new Error(`API [GET ${path}] is not MOCKED!`);
  // eslint-disable-next-line no-console
  console.log(err);
  throw err;
}

const mockApiCallsWithOutputs = (http: MockedFleetStartServices['http']) => {
  http.get.mockImplementation(async (path) => {
    if (typeof path !== 'string') {
      throw new Error('Invalid request');
    }
    if (path === '/api/fleet/outputs') {
      return {
        data: {
          items: [
            {
              id: 'output1',
              name: 'Output 1',
              is_default: true,
              is_default_monitoring: true,
              type: 'elasticsearch',
              is_internal: false,
            },
            {
              id: 'output2',
              name: 'Output 2',
              is_default: false,
              is_default_monitoring: false,
              type: 'elasticsearch',
              is_internal: false,
            },
            {
              id: 'internal-output',
              name: 'Internal Output',
              is_default: false,
              is_default_monitoring: false,
              type: 'elasticsearch',
              is_internal: true,
            },
          ],
        },
      };
    }

    return defaultHttpClientGetImplementation(path);
  });
};

const mockApiCallsWithOnlyInternalOutputs = (http: MockedFleetStartServices['http']) => {
  http.get.mockImplementation(async (path) => {
    if (typeof path !== 'string') {
      throw new Error('Invalid request');
    }
    if (path === '/api/fleet/outputs') {
      return {
        data: {
          items: [
            {
              id: 'internal-output-1',
              name: 'Internal Output 1',
              is_default: true,
              is_default_monitoring: true,
              type: 'elasticsearch',
              is_internal: true,
            },
            {
              id: 'internal-output-2',
              name: 'Internal Output 2',
              is_default: false,
              is_default_monitoring: false,
              type: 'elasticsearch',
              is_internal: true,
            },
          ],
        },
      };
    }

    return defaultHttpClientGetImplementation(path);
  });
};

describe('useOutputs', () => {
  const packagePolicy: Pick<PackagePolicy, 'supports_agentless'> = {
    supports_agentless: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should filter out internal outputs when license allows output per integration', async () => {
    const testRenderer = createFleetTestRendererMock();
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => true,
    } as unknown as LicenseService);
    mockApiCallsWithOutputs(testRenderer.startServices.http);

    const { result } = testRenderer.renderHook(() => useOutputs(packagePolicy, 'test-package'));
    expect(result.current.isLoading).toBeTruthy();

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    // Should only return non-internal outputs
    expect(result.current.allowedOutputs).toHaveLength(2);
    expect(result.current.allowedOutputs.map((o) => o.id)).toEqual(['output1', 'output2']);
    expect(result.current.allowedOutputs.every((o) => !o.is_internal)).toBe(true);
  });

  it('should return empty array when all outputs are internal', async () => {
    const testRenderer = createFleetTestRendererMock();
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => true,
    } as unknown as LicenseService);
    mockApiCallsWithOnlyInternalOutputs(testRenderer.startServices.http);

    const { result } = testRenderer.renderHook(() => useOutputs(packagePolicy, 'test-package'));
    expect(result.current.isLoading).toBeTruthy();

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    // Should return empty array since all outputs are internal
    expect(result.current.allowedOutputs).toHaveLength(0);
  });

  describe('inheritedOutputName', () => {
    const renderUseOutputs = (agentPolicies?: Array<{ data_output_id?: string | null }>) => {
      const testRenderer = createFleetTestRendererMock();
      mockedUseLicence.mockReturnValue({
        hasAtLeast: () => true,
      } as unknown as LicenseService);
      mockApiCallsWithOutputs(testRenderer.startServices.http);

      return testRenderer.renderHook(() =>
        useOutputs(packagePolicy, 'test-package', agentPolicies)
      );
    };

    it('should resolve to the default output when no agent policy is known yet', async () => {
      const { result } = renderUseOutputs();

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current.inheritedOutputName).toEqual('Output 1');
    });

    it('should resolve to the default output when the agent policy sets no data output', async () => {
      const { result } = renderUseOutputs([{ data_output_id: null }]);

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current.inheritedOutputName).toEqual('Output 1');
    });

    it("should resolve to the agent policy's data output when it sets one", async () => {
      const { result } = renderUseOutputs([{ data_output_id: 'output2' }]);

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current.inheritedOutputName).toEqual('Output 2');
    });

    it('should be undefined when the parent agent policies use different outputs', async () => {
      const { result } = renderUseOutputs([
        { data_output_id: 'output2' },
        { data_output_id: null },
      ]);

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current.inheritedOutputName).toBeUndefined();
    });
  });
});

const mockVarGroups: RegistryVarGroup[] = [
  {
    name: 'auth_method',
    title: 'Authentication',
    selector_title: 'Select method',
    options: [
      {
        name: 'cloud_connector',
        title: 'Cloud Connector',
        vars: ['connector_id'],
        hide_in_deployment_modes: ['default'],
      },
      { name: 'api_key', title: 'API Key', vars: ['api_key_var'] },
      { name: 'oauth', title: 'OAuth', vars: ['client_id', 'client_secret'] },
    ],
  },
];

const mockStreamVarGroups: RegistryVarGroup[] = [
  {
    name: 'log_group_source',
    title: 'Log Group Source',
    selector_title: 'Select log group source',
    options: [
      { name: 'log_group_arn', title: 'Log Group ARN', vars: ['log_group_arn'] },
      { name: 'log_group_name', title: 'Log Group Name', vars: ['log_group_name'] },
      {
        name: 'log_group_name_prefix',
        title: 'Log Group Name Prefix',
        vars: ['log_group_name_prefix'],
      },
    ],
  },
];

describe('useVarGroupSelections', () => {
  let mockOnSelectionsChange: jest.Mock;

  beforeEach(() => {
    mockOnSelectionsChange = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('selections derivation', () => {
    it('should return saved selections when provided', () => {
      const savedSelections = { auth_method: 'oauth' };

      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: mockVarGroups,
          savedSelections,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
        })
      );

      expect(result.current.selections).toEqual({ auth_method: 'oauth' });
    });

    it('should compute defaults when savedSelections is undefined and deployment mode is default', () => {
      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: mockVarGroups,
          savedSelections: undefined,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
        })
      );

      // First visible option (api_key) should be selected
      expect(result.current.selections).toEqual({ auth_method: 'api_key' });
    });

    it('should return empty object when varGroups is undefined', () => {
      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: undefined,
          savedSelections: undefined,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
        })
      );

      expect(result.current.selections).toEqual({});
    });

    it('should infer selections from populated vars on the edit page when none are saved', () => {
      // Policy predating var_groups: oauth vars are populated, so the derived
      // selection must be oauth, not the first visible option (api_key)
      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: mockVarGroups,
          savedSelections: undefined,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
          packagePolicy: {
            vars: {
              client_id: { type: 'text', value: 'my-client' },
              client_secret: { type: 'password', value: 'shhh' },
            },
          } as any,
          isEditPage: true,
        })
      );

      expect(result.current.selections).toEqual({ auth_method: 'oauth' });
      expect(mockOnSelectionsChange).toHaveBeenCalledWith({
        var_group_selections: { auth_method: 'oauth' },
      });
    });

    it('should infer stream selections from stream vars, not package vars, on the edit page', () => {
      // Follow-up from jillguyonnet 2026-11-10 (and the P3 review): the
      // stream-level call site has no packagePolicy, so without varsForInference
      // it could never infer — validation infers from the stream's vars while
      // the form defaulted to the first visible option. Stream vars must be
      // the evidence; package-level vars for a different group must not leak in.
      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: mockStreamVarGroups,
          savedSelections: undefined,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
          packagePolicy: {
            vars: {
              client_id: { type: 'text', value: 'my-client' },
              client_secret: { type: 'password', value: 'shhh' },
            },
          } as any,
          varsForInference: {
            log_group_name: { type: 'text', value: 'my-group' },
          },
          isEditPage: true,
        })
      );

      expect(result.current.selections).toEqual({ log_group_source: 'log_group_name' });
      expect(mockOnSelectionsChange).toHaveBeenCalledWith({
        var_group_selections: { log_group_source: 'log_group_name' },
      });
    });

    it('should not infer from vars on the create page', () => {
      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: mockVarGroups,
          savedSelections: undefined,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
          packagePolicy: {
            vars: {
              client_id: { type: 'text', value: 'my-client' },
              client_secret: { type: 'password', value: 'shhh' },
            },
          } as any,
          isEditPage: false,
        })
      );

      // Create flow keeps the first-visible-option default
      expect(result.current.selections).toEqual({ auth_method: 'api_key' });
    });

    it('should fall back to defaults on the edit page when no vars are populated', () => {
      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: mockVarGroups,
          savedSelections: undefined,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
          packagePolicy: { vars: {} } as any,
          isEditPage: true,
        })
      );

      expect(result.current.selections).toEqual({ auth_method: 'api_key' });
    });
  });

  describe('stale saved selections', () => {
    // Follow-up from the Libra P3 review (2026-11-10): a stored selection
    // naming an option the package no longer declares was returned as-is,
    // so shouldShowVar matched no option and hid every group-controlled
    // field while validation required the inferred option's vars. The hook
    // must normalize stale selections the same way validation does — treat
    // them as missing so derive/inference runs and gets persisted.
    const twoGroups: RegistryVarGroup[] = [...mockVarGroups, ...mockStreamVarGroups];

    it('should infer from populated vars on the edit page when the saved selection is stale', () => {
      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: mockVarGroups,
          savedSelections: { auth_method: 'saml' },
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
          packagePolicy: {
            vars: {
              client_id: { type: 'text', value: 'my-client' },
              client_secret: { type: 'password', value: 'shhh' },
            },
          } as any,
          isEditPage: true,
        })
      );

      // Same value validation derives for this policy (oauth), not the
      // stale name and not the first visible option (api_key)
      expect(result.current.selections).toEqual({ auth_method: 'oauth' });
      expect(mockOnSelectionsChange).toHaveBeenCalledWith({
        var_group_selections: { auth_method: 'oauth' },
      });
    });

    it('should fall back to defaults on the edit page when the saved selection is stale and nothing is populated', () => {
      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: mockVarGroups,
          savedSelections: { auth_method: 'saml' },
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
          packagePolicy: { vars: {} } as any,
          isEditPage: true,
        })
      );

      expect(result.current.selections).toEqual({ auth_method: 'api_key' });
      expect(mockOnSelectionsChange).toHaveBeenCalledWith({
        var_group_selections: { auth_method: 'api_key' },
      });
    });

    it('should fall back to defaults on the create page when the saved selection is stale', () => {
      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: mockVarGroups,
          savedSelections: { auth_method: 'saml' },
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
        })
      );

      expect(result.current.selections).toEqual({ auth_method: 'api_key' });
      expect(mockOnSelectionsChange).toHaveBeenCalledWith({
        var_group_selections: { auth_method: 'api_key' },
      });
    });

    it('should keep valid saved selections while normalizing only the stale group', () => {
      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: twoGroups,
          savedSelections: { auth_method: 'saml', log_group_source: 'log_group_name' },
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
          packagePolicy: {
            vars: {
              client_id: { type: 'text', value: 'my-client' },
              client_secret: { type: 'password', value: 'shhh' },
            },
          } as any,
          isEditPage: true,
        })
      );

      expect(result.current.selections).toEqual({
        auth_method: 'oauth',
        log_group_source: 'log_group_name',
      });
      expect(mockOnSelectionsChange).toHaveBeenCalledWith({
        var_group_selections: {
          auth_method: 'oauth',
          log_group_source: 'log_group_name',
        },
      });
    });

    it('should not resurrect a stale selection when another group changes', () => {
      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: twoGroups,
          savedSelections: { auth_method: 'saml', log_group_source: 'log_group_arn' },
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
        })
      );

      // Clear the initialization call
      mockOnSelectionsChange.mockClear();

      act(() => {
        result.current.handleSelectionChange('log_group_source', 'log_group_name');
      });

      expect(mockOnSelectionsChange).toHaveBeenCalledWith({
        var_group_selections: { auth_method: 'api_key', log_group_source: 'log_group_name' },
      });
    });

    it('should apply policy effects when a stale selection is normalized on mount', () => {
      // Combination of the stale-selection normalization with the policy
      // effects the mount write must apply (upstream #303565): the
      // normalized selection is the agentless default, and its support-flag
      // var starts undefined on the policy, so it must be set here.
      const providerVarGroups: RegistryVarGroup[] = [
        {
          name: 'credential_type',
          title: 'Setup Access',
          selector_title: 'Preferred method',
          required: true,
          options: [
            {
              name: 'identity_federation',
              title: 'Identity Federation',
              vars: ['role_arn', 'supports_identity_federation'],
              provider: 'aws',
              hide_in_deployment_modes: ['default'],
            },
            {
              name: 'direct_access_key',
              title: 'Direct Access Keys',
              vars: ['access_key_id', 'secret_access_key'],
            },
          ],
        },
      ];

      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: providerVarGroups,
          savedSelections: { credential_type: 'saml' },
          isAgentlessEnabled: true,
          onSelectionsChange: mockOnSelectionsChange,
          packagePolicy: {
            vars: {
              role_arn: { type: 'text', value: undefined },
              supports_identity_federation: { type: 'bool', value: undefined },
            },
          } as any,
          isEditPage: true,
        })
      );

      expect(result.current.selections).toEqual({ credential_type: 'identity_federation' });
      expect(mockOnSelectionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          var_group_selections: { credential_type: 'identity_federation' },
          supports_cloud_connector: true,
          vars: expect.objectContaining({
            supports_identity_federation: { type: 'bool', value: true },
          }),
        })
      );
    });
  });

  describe('initialization effect', () => {
    it('should call onSelectionsChange with defaults on mount when savedSelections is undefined', () => {
      renderHook(() =>
        useVarGroupSelections({
          varGroups: mockVarGroups,
          savedSelections: undefined,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
        })
      );

      expect(mockOnSelectionsChange).toHaveBeenCalledWith({
        var_group_selections: { auth_method: 'api_key' },
      });
    });

    it('should not call onSelectionsChange when savedSelections is already set', () => {
      renderHook(() =>
        useVarGroupSelections({
          varGroups: mockVarGroups,
          savedSelections: { auth_method: 'oauth' },
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
        })
      );

      expect(mockOnSelectionsChange).not.toHaveBeenCalled();
    });

    it('should not call onSelectionsChange when varGroups is undefined', () => {
      renderHook(() =>
        useVarGroupSelections({
          varGroups: undefined,
          savedSelections: undefined,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
        })
      );

      expect(mockOnSelectionsChange).not.toHaveBeenCalled();
    });

    it('should not call onSelectionsChange when varGroups is empty', () => {
      renderHook(() =>
        useVarGroupSelections({
          varGroups: [],
          savedSelections: undefined,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
        })
      );

      expect(mockOnSelectionsChange).not.toHaveBeenCalled();
    });
  });

  describe('handleSelectionChange', () => {
    it('should call onSelectionsChange with updated selections', () => {
      const savedSelections = { auth_method: 'api_key' };

      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: mockVarGroups,
          savedSelections,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
        })
      );

      act(() => {
        result.current.handleSelectionChange('auth_method', 'oauth');
      });

      expect(mockOnSelectionsChange).toHaveBeenCalledWith({
        var_group_selections: { auth_method: 'oauth' },
      });
    });

    it('should merge with existing selections when changing', () => {
      const savedSelections = { auth_method: 'api_key', other_group: 'existing' };

      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: mockVarGroups,
          savedSelections,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
        })
      );

      act(() => {
        result.current.handleSelectionChange('auth_method', 'oauth');
      });

      expect(mockOnSelectionsChange).toHaveBeenCalledWith({
        var_group_selections: { auth_method: 'oauth', other_group: 'existing' },
      });
    });

    it('should handle selection change when savedSelections is undefined', () => {
      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: mockVarGroups,
          savedSelections: undefined,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
        })
      );

      // Clear the initialization call
      mockOnSelectionsChange.mockClear();

      act(() => {
        result.current.handleSelectionChange('auth_method', 'oauth');
      });

      expect(mockOnSelectionsChange).toHaveBeenCalledWith({
        var_group_selections: { auth_method: 'oauth' },
      });
    });

    it('should clear deselected stream vars when streamVars is provided', () => {
      const savedSelections = { log_group_source: 'log_group_arn' };
      const streamVars = {
        log_group_arn: { value: 'arn:aws:logs:us-east-1:123456789012:log-group:my-group' },
        log_group_name: { value: '' },
      };

      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: mockStreamVarGroups,
          savedSelections,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
          streamVars,
        })
      );

      act(() => {
        result.current.handleSelectionChange('log_group_source', 'log_group_name');
      });

      expect(mockOnSelectionsChange).toHaveBeenCalledWith({
        var_group_selections: { log_group_source: 'log_group_name' },
        vars: {
          log_group_arn: { value: undefined },
          log_group_name: { value: '' },
        },
      });
    });

    it('should not include vars when streamVars is not provided', () => {
      const savedSelections = { log_group_source: 'log_group_arn' };

      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: mockStreamVarGroups,
          savedSelections,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
        })
      );

      act(() => {
        result.current.handleSelectionChange('log_group_source', 'log_group_name');
      });

      expect(mockOnSelectionsChange).toHaveBeenCalledWith({
        var_group_selections: { log_group_source: 'log_group_name' },
      });
    });
  });

  describe('re-renders and memoization', () => {
    it('should not re-compute selections if dependencies do not change', () => {
      const savedSelections = { auth_method: 'oauth' };

      const { result, rerender } = renderHook((props) => useVarGroupSelections(props), {
        initialProps: {
          varGroups: mockVarGroups,
          savedSelections,
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
        },
      });

      const initialSelections = result.current.selections;

      // Rerender with same props
      rerender({
        varGroups: mockVarGroups,
        savedSelections,
        isAgentlessEnabled: false,
        onSelectionsChange: mockOnSelectionsChange,
      });

      // Should be the same reference (memoized)
      expect(result.current.selections).toBe(initialSelections);
    });

    it('should re-compute selections when savedSelections changes', () => {
      const { result, rerender } = renderHook((props) => useVarGroupSelections(props), {
        initialProps: {
          varGroups: mockVarGroups,
          savedSelections: { auth_method: 'api_key' },
          isAgentlessEnabled: false,
          onSelectionsChange: mockOnSelectionsChange,
        },
      });

      expect(result.current.selections).toEqual({ auth_method: 'api_key' });

      // Rerender with different savedSelections
      rerender({
        varGroups: mockVarGroups,
        savedSelections: { auth_method: 'oauth' },
        isAgentlessEnabled: false,
        onSelectionsChange: mockOnSelectionsChange,
      });

      expect(result.current.selections).toEqual({ auth_method: 'oauth' });
    });
  });
});
