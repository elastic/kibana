/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import type { FilterCondition } from '@kbn/streamlang';

import { ConditionEditor } from './condition_editor';
import type { Suggestion } from './autocomplete_selector';

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({ value, onChange, dataTestSubj }: any) => (
    <textarea
      data-test-subj={dataTestSubj}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
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
  });

  describe('Invalid condition handling', () => {
    it('should show error for invalid condition', () => {
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

    it('should NOT call onConditionChange when JSON parsing fails in syntax editor', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
        />
      );

      // Toggle to syntax editor
      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      // Clear any previous calls from initialization
      mockOnConditionChange.mockClear();

      const codeEditor = screen.getByTestId('streamsAppConditionEditorCodeEditor');

      // Clear the editor to simulate empty/invalid JSON
      await user.clear(codeEditor);

      // Verify onConditionChange was NOT called when JSON is invalid
      // This prevents overriding user's partial input while typing
      expect(mockOnConditionChange).not.toHaveBeenCalled();
    });

    it('should NOT call onConditionChange when syntax editor contains invalid JSON', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
        />
      );

      // Toggle to syntax editor
      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      // Clear any previous calls from initialization
      mockOnConditionChange.mockClear();

      const codeEditor = screen.getByTestId('streamsAppConditionEditorCodeEditor');

      // Type invalid JSON
      await user.clear(codeEditor);
      await user.type(codeEditor, '{{invalid');

      // Verify onConditionChange was NOT called when JSON is invalid
      // This prevents overriding user's partial input while typing
      expect(mockOnConditionChange).not.toHaveBeenCalled();
    });

    it('should call onConditionChange when syntax editor contains valid JSON', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
        />
      );

      // Toggle to syntax editor
      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      // Clear any previous calls from initialization
      mockOnConditionChange.mockClear();

      const codeEditor = screen.getByTestId('streamsAppConditionEditorCodeEditor');

      // Type valid JSON
      await user.clear(codeEditor);
      await user.type(codeEditor, '{{"field": "test", "eq": "value"}}');

      // Verify onConditionChange was called with the parsed JSON
      expect(mockOnConditionChange).toHaveBeenCalled();
    });

    it('should show error message when condition becomes invalid via syntax editor', () => {
      // Render with an invalid condition (simulating what happens after the fix)
      const invalidCondition = {} as any;

      renderWithProviders(
        <ConditionEditor
          condition={invalidCondition}
          status="enabled"
          onConditionChange={mockOnConditionChange}
        />
      );

      expect(
        screen.getByText(/The condition is invalid or in unrecognized format/i)
      ).toBeInTheDocument();
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
    it('should report invalid JSON without changing the condition', async () => {
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
      await user.paste('{');

      expect(mockOnConditionChange).not.toHaveBeenCalled();
      expect(mockOnValidityChange).toHaveBeenLastCalledWith(false);
    });

    it('should not clobber local syntax text on rerender while JSON is invalid', async () => {
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
      await user.paste('{');

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

      expect(screen.getByTestId('streamsAppConditionEditorCodeEditor')).toHaveValue('{');
    });

    it('should report valid JSON and update condition on parse', async () => {
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
      await user.paste('{"field":"severity_text","eq":"warn"}');

      expect(mockOnConditionChange).toHaveBeenCalledWith({ field: 'severity_text', eq: 'warn' });
      expect(mockOnValidityChange).toHaveBeenLastCalledWith(true);
    });
  });
});
