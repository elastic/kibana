/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import moment from 'moment';
import { parseArrayEntry, parseFormData, ToolTestFlyout } from './test_tools';
import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';

const mockUseTool = jest.fn();
const mockUseExecuteTool = jest.fn();
const mockUseAgentBuilderServices = jest.fn();

jest.mock('../../../hooks/tools/use_tools', () => ({
  useTool: () => mockUseTool(),
}));

jest.mock('../../../hooks/tools/use_execute_tools', () => ({
  useExecuteTool: () => mockUseExecuteTool(),
}));

jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => mockUseAgentBuilderServices(),
}));

const mockToolDefinition: ToolDefinitionWithSchema = {
  id: 'test-tool',
  name: 'Test Tool',
  description: 'A test tool',
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: 'Name',
      },
    },
    required: [],
  },
} as unknown as ToolDefinitionWithSchema;

describe('parseFormData', () => {
  const mockParameters = [
    { name: 'settings', type: 'object' },
    { name: 'tags', type: 'array' },
    { name: 'description', type: 'string' },
  ];

  it('successfully parses valid JSON strings for object/array types', () => {
    const rawData = {
      settings: '{"color": "blue", "retry": true}',
      tags: '["urgent", "review"]',
      description: 'Standard text',
    };

    const result = parseFormData(rawData, mockParameters);

    expect(result.settings).toEqual({ color: 'blue', retry: true });
    expect(result.tags).toEqual(['urgent', 'review']);
    expect(result.description).toBe('Standard text');
  });

  it('falls back to the raw string if JSON is malformed', () => {
    const rawData = {
      settings: '{"unclosed_brace": true', // Missing '}'
    };

    const result = parseFormData(rawData, mockParameters);

    // Should return the original string instead of throwing an error
    expect(result.settings).toBe('{"unclosed_brace": true');
  });

  it('excludes empty strings and whitespace-only values', () => {
    const rawData = {
      settings: '   ',
      tags: '',
      description: 'valid value',
    };

    const result = parseFormData(rawData, mockParameters);

    expect(result).not.toHaveProperty('settings');
    expect(result).not.toHaveProperty('tags');
    expect(result.description).toBe('valid value');
  });

  it('handles fields that are not present in the parameters list', () => {
    const rawData = {
      unknownField: '{"key": "value"}',
    };

    const result = parseFormData(rawData, mockParameters);

    // It should just pass through unchanged because the type isn't confirmed
    expect(result.unknownField).toBe('{"key": "value"}');
  });

  it('passes through non-string values unchanged', () => {
    const rawData = {
      settings: { alreadyParsed: true },
      tags: ['already', 'an', 'array'],
      description: 123,
    };

    const result = parseFormData(rawData, mockParameters);

    expect(result.settings).toEqual({ alreadyParsed: true });
    expect(result.tags).toEqual(['already', 'an', 'array']);
    expect(result.description).toBe(123);
  });

  it('handles empty form data', () => {
    const result = parseFormData({}, mockParameters);
    expect(result).toEqual({});
  });

  it('handles empty parameters list', () => {
    const rawData = {
      settings: '{"key": "value"}',
      description: 'text',
    };

    const result = parseFormData(rawData, []);

    // Without parameter type info, values pass through as-is
    expect(result.settings).toBe('{"key": "value"}');
    expect(result.description).toBe('text');
  });
});

describe('parseArrayEntry', () => {
  it('returns undefined for empty or whitespace values', () => {
    expect(parseArrayEntry('')).toBeUndefined();
    expect(parseArrayEntry('   ')).toBeUndefined();
  });

  it('returns unquoted numeric values as numbers', () => {
    expect(parseArrayEntry('123')).toBe(123);
    expect(parseArrayEntry('  45.6  ')).toBe(45.6);
  });

  it('returns quoted values as strings', () => {
    expect(parseArrayEntry('"123"')).toBe('123');
    expect(parseArrayEntry("'alpha'")).toBe('alpha');
  });

  it('returns non-numeric values as strings', () => {
    expect(parseArrayEntry('alpha')).toBe('alpha');
  });
});

describe('ToolTestFlyout date-time picker', () => {
  const mockTool: ToolDefinitionWithSchema = {
    ...mockToolDefinition,
    schema: {
      ...mockToolDefinition.schema,
      properties: {
        testField: {
          format: 'date-time',
          title: 'TestField Title',
          type: 'string',
        },
      },
    },
  };

  const mockOnClose = jest.fn();
  const mockExecuteTool = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentBuilderServices.mockReturnValue({
      docLinksService: {
        tools: 'https://example.com/docs',
      },
    });
    mockUseTool.mockReturnValue({
      tool: mockTool,
      isLoading: false,
    });
    mockUseExecuteTool.mockReturnValue({
      executeTool: mockExecuteTool,
      isLoading: false,
    });
  });

  const renderComponent = () => {
    return render(
      <IntlProvider locale="en">
        <ToolTestFlyout toolId="test-tool" onClose={mockOnClose} />
      </IntlProvider>
    );
  };

  const waitForDatePicker = async (container: HTMLElement, fieldName: string = 'testField') =>
    await waitFor(() => {
      const datePicker = container.querySelector(
        `[data-test-subj="agentBuilderToolTestInput-${fieldName}"]`
      );
      expect(datePicker).toBeInTheDocument();
      return datePicker;
    });

  it('renders date-time picker without a default value', async () => {
    const { container } = renderComponent();
    const datePicker = await waitForDatePicker(container);

    const input = datePicker?.querySelector('input');
    expect(input?.value).toBe('');
  });

  it('converts date picker onChange to ISO string format', async () => {
    const newDate = '01/15/2024 10:30 AM';
    const expectedIso = moment(newDate, 'MM/DD/YYYY hh:mm A').toISOString(); // Convert local date-time to ISO string

    const { container } = renderComponent();
    const datePicker = await waitForDatePicker(container);

    // Simulate date change
    const datePickerInput = datePicker?.querySelector('input');

    act(() => {
      fireEvent.change(datePickerInput as Element, {
        target: { value: newDate },
      });
    });

    // Submit the form
    await act(async () => {
      fireEvent.click(
        container.querySelector('[data-test-subj="agentBuilderToolTestSubmitButton"]') as Element
      );
    });

    const updatedDatePicker = await waitForDatePicker(container);
    const input = updatedDatePicker?.querySelector('input');
    expect(input?.value).toBe(newDate);

    await waitFor(() => {
      expect(mockExecuteTool).toHaveBeenCalled();
    });

    const callArgs = mockExecuteTool.mock.calls[0][0];
    expect(callArgs.toolParams.testField).toBe(expectedIso);
  });
});

describe('ToolTestFlyout array combo box', () => {
  const mockTool: ToolDefinitionWithSchema = {
    ...mockToolDefinition,
    schema: {
      ...mockToolDefinition.schema,
      properties: {
        tags: {
          title: 'Tags',
          type: 'array',
        },
      },
    },
  };

  const mockOnClose = jest.fn();
  const mockExecuteTool = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentBuilderServices.mockReturnValue({
      docLinksService: {
        tools: 'https://example.com/docs',
      },
    });
    mockUseTool.mockReturnValue({
      tool: mockTool,
      isLoading: false,
    });
    mockUseExecuteTool.mockReturnValue({
      executeTool: mockExecuteTool,
      isLoading: false,
    });
  });

  const renderComponent = () => {
    return render(
      <IntlProvider locale="en">
        <ToolTestFlyout toolId="test-tool" onClose={mockOnClose} />
      </IntlProvider>
    );
  };

  it('creates options and submits mixed numeric/string values', async () => {
    const { container } = renderComponent();
    const comboBox = await waitFor(() =>
      container.querySelector('[data-test-subj="agentBuilderToolTestInput-tags"]')
    );
    const input = comboBox?.querySelector('input');

    expect(input).toBeInTheDocument();

    act(() => {
      fireEvent.change(input as Element, { target: { value: '123' } });
      fireEvent.keyDown(input as Element, { key: 'Enter' });
    });

    act(() => {
      fireEvent.change(input as Element, { target: { value: 'alpha' } });
      fireEvent.keyDown(input as Element, { key: 'Enter' });
    });

    await act(async () => {
      fireEvent.click(
        container.querySelector('[data-test-subj="agentBuilderToolTestSubmitButton"]') as Element
      );
    });

    await waitFor(() => {
      expect(mockExecuteTool).toHaveBeenCalled();
    });

    const callArgs = mockExecuteTool.mock.calls[0][0];
    expect(callArgs.toolParams.tags).toEqual([123, 'alpha']);
  });
});

describe('ToolTestFlyout numeric field', () => {
  const mockTool: ToolDefinitionWithSchema = {
    ...mockToolDefinition,
    schema: {
      ...mockToolDefinition.schema,
      properties: {
        count: {
          title: 'Count',
          type: 'number',
        },
      },
    },
  };

  const mockOnClose = jest.fn();
  const mockExecuteTool = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentBuilderServices.mockReturnValue({
      docLinksService: {
        tools: 'https://example.com/docs',
      },
    });
    mockUseTool.mockReturnValue({
      tool: mockTool,
      isLoading: false,
    });
    mockUseExecuteTool.mockReturnValue({
      executeTool: mockExecuteTool,
      isLoading: false,
    });
  });

  const renderComponent = () => {
    return render(
      <IntlProvider locale="en">
        <ToolTestFlyout toolId="test-tool" onClose={mockOnClose} />
      </IntlProvider>
    );
  };

  it('submits 0 as a number, not a string (valueAsNumber must be used, not fallback to value)', async () => {
    const { container } = renderComponent();
    const numericInput = await waitFor(() =>
      container.querySelector('[data-test-subj="agentBuilderToolTestInput-count"]')
    );

    expect(numericInput).toBeInTheDocument();

    act(() => {
      fireEvent.change(numericInput as Element, {
        target: { value: '0', valueAsNumber: 0 },
      });
    });

    await act(async () => {
      fireEvent.click(
        container.querySelector('[data-test-subj="agentBuilderToolTestSubmitButton"]') as Element
      );
    });

    await waitFor(() => {
      expect(mockExecuteTool).toHaveBeenCalled();
    });

    const callArgs = mockExecuteTool.mock.calls[0][0];
    expect(callArgs.toolParams.count).toBe(0);
    expect(typeof callArgs.toolParams.count).toBe('number');
  });
});
