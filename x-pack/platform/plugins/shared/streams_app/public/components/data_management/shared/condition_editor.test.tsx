/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import { ConditionEditor } from './condition_editor';

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({ value, onChange, dataTestSubj }: any) => (
    <textarea
      data-test-subj={dataTestSubj}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('ConditionEditor', () => {
  const mockOnConditionChange = jest.fn();

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
});
