/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import yaml from 'yaml';
import type { Condition, FilterCondition } from '@kbn/streamlang';

import { ConditionEditor } from './condition_editor';
import type { Suggestion } from './autocomplete_selector';

jest.mock('@kbn/code-editor', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CodeEditor: ({ value, onChange, onBlur, dataTestSubj }: any) => (
    <textarea
      data-test-subj={dataTestSubj}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={() => onBlur?.()}
    />
  ),
}));

// Mock the useKibana hook
jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: {
      docLinks: {
        links: {
          date: {
            dateMath:
              'https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#date-math',
          },
        },
      },
    },
  }),
}));

// Mock the condition YAML service
jest.mock('./condition_yaml_service', () => ({
  conditionYamlService: {
    register: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  },
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

// Helper function to render with IntlProvider
const renderWithIntl = (component: React.ReactElement) => {
  return render(<IntlProvider>{component}</IntlProvider>);
};

describe('ConditionEditor', () => {
  const mockOnConditionChange = jest.fn();
  const mockOnValidityChange = jest.fn();

  const defaultFieldSuggestions: Suggestion[] = [
    { name: 'status', type: 'keyword' },
    { name: 'timestamp', type: 'date' },
    { name: 'count', type: 'number' },
  ];

  const defaultValueSuggestions: Suggestion[] = [
    { name: 'active', type: 'keyword' },
    { name: 'inactive', type: 'keyword' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Syntax editor', () => {
    it('should show syntax editor toggle switch', () => {
      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      expect(screen.getByTestId('streamsAppConditionEditorSwitch')).toBeInTheDocument();
    });

    it('should toggle to syntax editor when switch is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      expect(screen.getByTestId('streamsAppConditionEditorCodeEditor')).toBeInTheDocument();
    });

    it('should disable syntax editor switch when status is disabled', () => {
      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="disabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      expect(switchButton).toBeDisabled();
    });

    it('does not call onConditionChange on every keystroke; emits on debounce when YAML is valid', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      const textarea = screen.getByTestId(
        'streamsAppConditionEditorCodeEditor'
      ) as HTMLTextAreaElement;
      const nextValue = yaml.stringify({ field: 'severity_text', eq: 'error' });

      fireEvent.change(textarea, { target: { value: nextValue } });
      expect(mockOnConditionChange).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(400);
      });

      expect(mockOnConditionChange).toHaveBeenCalledTimes(1);
      expect(mockOnConditionChange).toHaveBeenCalledWith({ field: 'severity_text', eq: 'error' });

      jest.useRealTimers();
    });

    it('flushes the last valid YAML immediately on blur', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      const textarea = screen.getByTestId(
        'streamsAppConditionEditorCodeEditor'
      ) as HTMLTextAreaElement;
      const nextValue = yaml.stringify({ field: 'severity_text', eq: 'warn' });

      fireEvent.change(textarea, { target: { value: nextValue } });
      expect(mockOnConditionChange).not.toHaveBeenCalled();

      fireEvent.blur(textarea);
      expect(mockOnConditionChange).toHaveBeenCalledTimes(1);
      expect(mockOnConditionChange).toHaveBeenCalledWith({ field: 'severity_text', eq: 'warn' });

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(mockOnConditionChange).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('does not flush on blur when the syntax editor value has not changed', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      const textarea = screen.getByTestId(
        'streamsAppConditionEditorCodeEditor'
      ) as HTMLTextAreaElement;

      fireEvent.blur(textarea);
      expect(mockOnConditionChange).not.toHaveBeenCalled();
    });

    it('flushes pending debounced updates on unmount', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      const { unmount } = renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      const textarea = screen.getByTestId(
        'streamsAppConditionEditorCodeEditor'
      ) as HTMLTextAreaElement;
      const nextValue = yaml.stringify({ field: 'severity_text', eq: 'debug' });

      fireEvent.change(textarea, { target: { value: nextValue } });
      expect(mockOnConditionChange).not.toHaveBeenCalled();

      unmount();
      expect(mockOnConditionChange).toHaveBeenCalledTimes(1);
      expect(mockOnConditionChange).toHaveBeenCalledWith({ field: 'severity_text', eq: 'debug' });

      jest.useRealTimers();
    });
  });

  describe('Invalid condition handling', () => {
    it('should show error for invalid condition', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invalidCondition = { invalid: 'condition' } as any;

      renderWithProviders(
        <ConditionEditor
          condition={invalidCondition}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      expect(
        screen.getByText(/The condition is invalid or in unrecognized format/i)
      ).toBeInTheDocument();
    });

    it('should NOT call onConditionChange when YAML parsing fails in syntax editor', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      // Toggle to syntax editor
      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      // Clear any previous calls from initialization
      mockOnConditionChange.mockClear();

      const codeEditor = screen.getByTestId('streamsAppConditionEditorCodeEditor');

      // Clear the editor to simulate empty/invalid YAML
      await user.clear(codeEditor);

      // Verify onConditionChange was NOT called when YAML is invalid
      // This prevents overriding user's partial input while typing
      expect(mockOnConditionChange).not.toHaveBeenCalled();
    });

    it('should NOT call onConditionChange when syntax editor contains invalid YAML', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      // Toggle to syntax editor
      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      // Clear any previous calls from initialization
      mockOnConditionChange.mockClear();

      const codeEditor = screen.getByTestId('streamsAppConditionEditorCodeEditor');

      // Set invalid YAML via fireEvent.change (userEvent.type has issues with special chars)
      fireEvent.change(codeEditor, { target: { value: 'field: [unclosed' } });

      // Verify onConditionChange was NOT called when YAML is invalid
      // This prevents overriding user's partial input while typing
      expect(mockOnConditionChange).not.toHaveBeenCalled();
    });

    it('should call onConditionChange when syntax editor contains valid YAML', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      // Toggle to syntax editor
      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      // Clear any previous calls from initialization
      mockOnConditionChange.mockClear();

      const codeEditor = screen.getByTestId('streamsAppConditionEditorCodeEditor');

      // Set valid YAML via fireEvent.change (userEvent.type types character by character which is problematic)
      const validYaml = yaml.stringify({ field: 'test', eq: 'value' });
      fireEvent.change(codeEditor, { target: { value: validYaml } });

      // Wait for debounce to complete
      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Verify onConditionChange was called with the parsed YAML
      expect(mockOnConditionChange).toHaveBeenCalled();
      expect(mockOnConditionChange).toHaveBeenCalledWith({ field: 'test', eq: 'value' });

      jest.useRealTimers();
    });

    it('should show error message when condition becomes invalid via syntax editor', () => {
      // Render with an invalid condition (simulating what happens after the fix)
      const invalidCondition = {} as Condition;

      renderWithProviders(
        <ConditionEditor
          condition={invalidCondition}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      expect(
        screen.getByText(/The condition is invalid or in unrecognized format/i)
      ).toBeInTheDocument();
    });

    it('should NOT call onConditionChange and should report invalid when syntax editor is cleared (empty string)', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      mockOnConditionChange.mockClear();
      mockOnValidityChange.mockClear();

      const codeEditor = screen.getByTestId('streamsAppConditionEditorCodeEditor');

      fireEvent.change(codeEditor, { target: { value: '' } });

      act(() => {
        jest.advanceTimersByTime(400);
      });

      expect(mockOnConditionChange).not.toHaveBeenCalled();
      expect(mockOnValidityChange).toHaveBeenCalledWith(false);

      jest.useRealTimers();
    });

    it('should NOT call onConditionChange on blur when syntax editor is empty', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      mockOnConditionChange.mockClear();

      const codeEditor = screen.getByTestId('streamsAppConditionEditorCodeEditor');

      fireEvent.change(codeEditor, { target: { value: '' } });
      fireEvent.blur(codeEditor);

      expect(mockOnConditionChange).not.toHaveBeenCalled();
    });
  });

  describe('help text for date math', () => {
    it('shows help text when field is date type and operator is range', () => {
      const condition: FilterCondition = {
        field: 'timestamp',
        range: { gte: '2024-01-01', lte: '2024-12-31' },
      };

      renderWithIntl(
        <ConditionEditor
          condition={condition}
          status="enabled"
          onConditionChange={jest.fn()}
          onValidityChange={jest.fn()}
          fieldSuggestions={defaultFieldSuggestions}
          valueSuggestions={defaultValueSuggestions}
        />
      );

      expect(screen.getByText(/You can use/i)).toBeInTheDocument();
      expect(screen.getByText(/date math/i)).toBeInTheDocument();
    });

    it('does not show help text when field is not date type', () => {
      const condition: FilterCondition = {
        field: 'status',
        range: { gte: '100', lte: '200' },
      };

      renderWithIntl(
        <ConditionEditor
          condition={condition}
          status="enabled"
          onConditionChange={jest.fn()}
          onValidityChange={jest.fn()}
          fieldSuggestions={defaultFieldSuggestions}
          valueSuggestions={defaultValueSuggestions}
        />
      );

      expect(screen.queryByText(/You can use/i)).not.toBeInTheDocument();
    });

    it('does not show help text when operator is not range', () => {
      const condition: FilterCondition = {
        field: 'timestamp',
        eq: '2024-01-01',
      };

      renderWithIntl(
        <ConditionEditor
          condition={condition}
          status="enabled"
          onConditionChange={jest.fn()}
          onValidityChange={jest.fn()}
          fieldSuggestions={defaultFieldSuggestions}
          valueSuggestions={defaultValueSuggestions}
        />
      );

      expect(screen.queryByText(/You can use/i)).not.toBeInTheDocument();
    });

    it('does not show help text when field is date but operator is not range', () => {
      const condition: FilterCondition = {
        field: 'timestamp',
        gte: '2024-01-01',
      };

      renderWithIntl(
        <ConditionEditor
          condition={condition}
          status="enabled"
          onConditionChange={jest.fn()}
          onValidityChange={jest.fn()}
          fieldSuggestions={defaultFieldSuggestions}
          valueSuggestions={defaultValueSuggestions}
        />
      );

      expect(screen.queryByText(/You can use/i)).not.toBeInTheDocument();
    });

    it('help text link points to date math documentation', () => {
      const condition: FilterCondition = {
        field: 'timestamp',
        range: { gte: 'now-1d', lte: 'now' },
      };

      renderWithIntl(
        <ConditionEditor
          condition={condition}
          status="enabled"
          onConditionChange={jest.fn()}
          onValidityChange={jest.fn()}
          fieldSuggestions={defaultFieldSuggestions}
          valueSuggestions={defaultValueSuggestions}
        />
      );

      const link = screen.getByTestId('streamsAppConditionEditorDateMathLink');
      expect(link).toHaveAttribute(
        'href',
        'https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#date-math'
      );
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('Validity plumbing', () => {
    it('should report invalid YAML without changing the condition', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      await user.click(screen.getByTestId('streamsAppConditionEditorSwitch'));

      const editor = screen.getByTestId('streamsAppConditionEditorCodeEditor');
      await user.clear(editor);
      await user.paste('field: [unclosed');

      expect(mockOnConditionChange).not.toHaveBeenCalled();
      expect(mockOnValidityChange).toHaveBeenLastCalledWith(false);
    });

    it('should not clobber local syntax text on rerender while YAML is invalid', async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      await user.click(screen.getByTestId('streamsAppConditionEditorSwitch'));

      const editor = screen.getByTestId('streamsAppConditionEditorCodeEditor');
      await user.clear(editor);
      await user.paste('field: [unclosed');

      rerender(
        <I18nProvider>
          <ConditionEditor
            condition={{ field: 'severity_text', eq: 'info' }}
            status="enabled"
            onConditionChange={mockOnConditionChange}
            onValidityChange={mockOnValidityChange}
          />
        </I18nProvider>
      );

      expect(screen.getByTestId('streamsAppConditionEditorCodeEditor')).toHaveValue(
        'field: [unclosed'
      );
    });

    it('should report valid YAML and update condition on parse', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
          onValidityChange={mockOnValidityChange}
        />
      );

      await user.click(screen.getByTestId('streamsAppConditionEditorSwitch'));

      const editor = screen.getByTestId('streamsAppConditionEditorCodeEditor');

      // Use fireEvent.change to set valid YAML directly
      const validYaml = 'field: severity_text\neq: warn\n';
      fireEvent.change(editor, { target: { value: validYaml } });

      // Wait for debounce to complete
      act(() => {
        jest.advanceTimersByTime(400);
      });

      expect(mockOnConditionChange).toHaveBeenCalledWith({ field: 'severity_text', eq: 'warn' });
      expect(mockOnValidityChange).toHaveBeenLastCalledWith(true);

      jest.useRealTimers();
    });
  });
});
