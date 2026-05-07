/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  SchemaFlyoutEditor,
  getByPath,
  setByPath,
  extractSettingsFromState,
  mergeSettingsIntoState,
} from './schema_flyout_editor';
import type { FieldDescriptor } from './types';

// Mock useKibana to provide http service — stable reference to prevent useEffect loops
const mockHttpGet = jest.fn();
const mockServices = {
  services: {
    http: {
      get: mockHttpGet,
    },
  },
};
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => mockServices,
}));

describe('getByPath', () => {
  it('returns nested value', () => {
    expect(getByPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('returns undefined for missing path', () => {
    expect(getByPath({ a: 1 }, 'b.c')).toBeUndefined();
  });

  it('returns top-level value', () => {
    expect(getByPath({ x: 'hello' }, 'x')).toBe('hello');
  });

  it('handles null object', () => {
    expect(getByPath(null, 'a')).toBeUndefined();
  });
});

describe('setByPath', () => {
  it('sets nested value immutably', () => {
    const original = { a: { b: 1 } };
    const result = setByPath(original, 'a.b', 2) as Record<string, unknown>;
    expect((result.a as Record<string, unknown>).b).toBe(2);
    expect(original.a.b).toBe(1);
  });

  it('creates intermediate objects', () => {
    const result = setByPath({}, 'a.b.c', 'value') as Record<string, unknown>;
    expect(getByPath(result, 'a.b.c')).toBe('value');
  });

  it('sets top-level value', () => {
    const result = setByPath({ x: 1 }, 'x', 2) as Record<string, unknown>;
    expect(result.x).toBe(2);
  });
});

describe('extractSettingsFromState', () => {
  it('extracts leaf values from state', () => {
    const state = { styling: { paging: 10, density: { mode: 'compact' } } };
    const fields: FieldDescriptor[] = [
      {
        path: 'styling',
        type: 'section',
        label: 'Styling',
        children: [
          { path: 'styling.paging', type: 'number', label: 'Paging' },
          {
            path: 'styling.density',
            type: 'section',
            label: 'Density',
            children: [{ path: 'styling.density.mode', type: 'select', label: 'Mode' }],
          },
        ],
      },
    ];
    const result = extractSettingsFromState(state, fields);
    expect(result).toEqual({
      'styling.paging': 10,
      'styling.density.mode': 'compact',
    });
  });
});

describe('mergeSettingsIntoState', () => {
  it('merges form values back into state', () => {
    const state = { styling: { paging: 10 }, type: 'data_table' };
    const result = mergeSettingsIntoState(state, { 'styling.paging': 20 }) as Record<
      string,
      unknown
    >;
    expect((result.styling as Record<string, unknown>).paging).toBe(20);
    expect(result.type).toBe('data_table');
  });
});

describe('SchemaFlyoutEditor', () => {
  const setState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when fetch returns no data for visualization', async () => {
    mockHttpGet.mockResolvedValue({});

    const { container } = render(
      <SchemaFlyoutEditor visualizationId="unknownViz" state={{}} setState={setState} />
    );

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledWith('/internal/lens/schema_descriptions');
    });

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when there are no visible fields', async () => {
    mockHttpGet.mockResolvedValue({
      lnsDatatable: { fields: [] },
    });

    const { container } = render(
      <SchemaFlyoutEditor visualizationId="lnsDatatable" state={{}} setState={setState} />
    );

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalled();
    });

    expect(container.innerHTML).toBe('');
  });

  it('renders form fields for a mapped visualization', async () => {
    const mockFields: FieldDescriptor[] = [
      { path: 'styling.density.mode', type: 'select', label: 'Density', widget: 'buttonGroup' },
      { path: 'styling.row_numbers.visible', type: 'toggle', label: 'Show row numbers' },
    ];

    mockHttpGet.mockResolvedValue({
      lnsDatatable: { fields: mockFields },
    });

    render(<SchemaFlyoutEditor visualizationId="lnsDatatable" state={{}} setState={setState} />);

    await waitFor(() => {
      expect(screen.getByTestId('schemaField-styling.density.mode')).toBeInTheDocument();
    });
    expect(screen.getByTestId('schemaField-styling.row_numbers.visible')).toBeInTheDocument();
  });

  it('renders nothing when fetch fails', async () => {
    mockHttpGet.mockRejectedValue(new Error('Network error'));

    const { container } = render(
      <SchemaFlyoutEditor visualizationId="lnsDatatable" state={{}} setState={setState} />
    );

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalled();
    });

    expect(container.innerHTML).toBe('');
  });
});
