/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import type { RegistryVarGroup } from '../../../../../../types';

import { useVarGroupSelections } from './hooks';

const mockVarGroups: RegistryVarGroup[] = [
  {
    name: 'auth_method',
    title: 'Authentication',
    selector_title: 'Select method',
    options: [
      { name: 'api_key', title: 'API Key', vars: ['api_key_var'] },
      { name: 'oauth', title: 'OAuth', vars: ['client_id', 'client_secret'] },
      {
        name: 'cloud_connector',
        title: 'Cloud Connector',
        vars: ['connector_id'],
        hide_in_deployment_modes: ['default'],
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

    it('should compute defaults when savedSelections is undefined', () => {
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

    it('should respect deployment mode when computing defaults', () => {
      // In agentless mode, cloud_connector is visible but still not first
      const { result } = renderHook(() =>
        useVarGroupSelections({
          varGroups: mockVarGroups,
          savedSelections: undefined,
          isAgentlessEnabled: true,
          onSelectionsChange: mockOnSelectionsChange,
        })
      );

      // First visible option is still api_key
      expect(result.current.selections).toEqual({ auth_method: 'api_key' });
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
