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
