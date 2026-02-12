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
import type { FilterCondition } from '@kbn/streamlang';

import { ConditionEditor } from './condition_editor';
import type { Suggestion } from './autocomplete_selector';

jest.mock('@kbn/code-editor', () => ({
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

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

// Helper function to render with IntlProvider
const renderWithIntl = (component: React.ReactElement) => {
  return render(<IntlProvider>{component}</IntlProvider>);
};

describe('ConditionEditor', () => {
  const mockOnConditionChange = jest.fn();

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
        />
      );

      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      expect(switchButton).toBeDisabled();
    });

    it('does not call onConditionChange on every keystroke; emits on debounce when JSON is valid', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
        />
      );

      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      const textarea = screen.getByTestId(
        'streamsAppConditionEditorCodeEditor'
      ) as HTMLTextAreaElement;
      const nextValue = JSON.stringify({ field: 'severity_text', eq: 'error' }, null, 2);

      fireEvent.change(textarea, { target: { value: nextValue } });
      expect(mockOnConditionChange).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(400);
      });

      expect(mockOnConditionChange).toHaveBeenCalledTimes(1);
      expect(mockOnConditionChange).toHaveBeenCalledWith({ field: 'severity_text', eq: 'error' });

      jest.useRealTimers();
    });

    it('flushes the last valid JSON immediately on blur', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ConditionEditor
          condition={{ field: 'severity_text', eq: 'info' }}
          status="enabled"
          onConditionChange={mockOnConditionChange}
        />
      );

      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      const textarea = screen.getByTestId(
        'streamsAppConditionEditorCodeEditor'
      ) as HTMLTextAreaElement;
      const nextValue = JSON.stringify({ field: 'severity_text', eq: 'warn' }, null, 2);

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
        />
      );

      const switchButton = screen.getByTestId('streamsAppConditionEditorSwitch');
      await user.click(switchButton);

      const textarea = screen.getByTestId(
        'streamsAppConditionEditorCodeEditor'
      ) as HTMLTextAreaElement;
      const nextValue = JSON.stringify({ field: 'severity_text', eq: 'debug' }, null, 2);

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
      const invalidCondition = { invalid: 'condition' } as any;

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
});
