/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { dump } from 'js-yaml';
import { useFormContext } from 'react-hook-form';
import { YamlRuleForm, type YamlRuleFormProps } from './yaml_rule_form';
import { createFormWrapper, createMockServices } from '../test_utils';

// Hosts the lifted yamlText state so existing tests can keep firing onChange and
// observing the resulting submit. After Commit 1, YamlRuleForm receives yamlText
// from its parent (RuleFormContent in production). For unit tests of YamlRuleForm
// in isolation, this small wrapper plays the parent's role.
const StatefulYamlRuleForm = ({
  initialYaml = '',
  ...props
}: Omit<YamlRuleFormProps, 'yamlText' | 'setYamlText'> & { initialYaml?: string }) => {
  const [yamlText, setYamlText] = useState(initialYaml);
  return <YamlRuleForm {...props} yamlText={yamlText} setYamlText={setYamlText} />;
};

// Mock the yaml-rule-editor to avoid monaco editor setup
jest.mock('@kbn/yaml-rule-editor', () => ({
  YamlRuleEditor: ({
    value,
    onChange,
    onBlur,
    isReadOnly,
    dataTestSubj,
  }: {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    isReadOnly?: boolean;
    dataTestSubj?: string;
  }) => (
    <textarea
      data-test-subj={dataTestSubj}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={isReadOnly}
      aria-label="YAML Editor"
    />
  ),
}));

// Mock EUI components that cause act() warnings due to internal state management
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    // Simple passthrough for EuiFormRow - removes internal state management
    EuiFormRow: ({
      children,
      label,
      helpText,
      error,
      isInvalid,
      fullWidth,
      ...props
    }: {
      children: React.ReactNode;
      label?: React.ReactNode;
      helpText?: React.ReactNode;
      error?: React.ReactNode;
      isInvalid?: boolean;
      fullWidth?: boolean;
      [key: string]: unknown;
    }) => (
      <div {...props}>
        {label && <label>{label}</label>}
        {children}
        {helpText && <span>{helpText}</span>}
        {isInvalid && error && <span>{error}</span>}
      </div>
    ),
    // Disable EuiCallOut's live announcer
    EuiCallOut: ({
      children,
      title,
      color,
      iconType,
      ...props
    }: {
      children?: React.ReactNode;
      title?: React.ReactNode;
      color?: string;
      iconType?: string;
      [key: string]: unknown;
    }) => (
      <div data-test-subj={props['data-test-subj'] as string} role="alert">
        {title && <span>{title}</span>}
        {children}
      </div>
    ),
  };
});

describe('YamlRuleForm component', () => {
  const mockServices = createMockServices();

  const defaultProps = {
    services: mockServices,
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the YAML editor with the provided yamlText prop', () => {
    // After Commit 1, YamlRuleForm no longer derives YAML from form context;
    // its parent (RuleFormContent) does. The "derive from form" behavior is
    // covered in rule_form.test.tsx.
    const initialYaml = dump({
      kind: 'alert',
      metadata: { name: 'Initial Rule', enabled: true },
      evaluation: { query: { base: 'FROM logs-*' } },
    });

    render(<StatefulYamlRuleForm {...defaultProps} initialYaml={initialYaml} />, {
      wrapper: createFormWrapper(),
    });

    const editor = screen.getByRole('textbox', { name: 'YAML Editor' }) as HTMLTextAreaElement;
    expect(editor).toBeInTheDocument();
    expect(editor.value).toContain('Initial Rule');
  });

  it('disables editor when isDisabled is true', () => {
    render(<StatefulYamlRuleForm {...defaultProps} isDisabled />, { wrapper: createFormWrapper() });

    const editor = screen.getByRole('textbox', { name: 'YAML Editor' });
    expect(editor).toBeDisabled();
  });

  it('disables editor when isSubmitting is true', () => {
    render(<StatefulYamlRuleForm {...defaultProps} isSubmitting />, {
      wrapper: createFormWrapper(),
    });

    const editor = screen.getByRole('textbox', { name: 'YAML Editor' });
    expect(editor).toBeDisabled();
  });

  it('calls onSubmit with parsed values on valid submission', async () => {
    const onSubmit = jest.fn();

    render(<StatefulYamlRuleForm {...defaultProps} onSubmit={onSubmit} />, {
      wrapper: createFormWrapper(),
    });

    const editor = screen.getByRole('textbox', { name: 'YAML Editor' });

    // Replace editor content with valid YAML
    const validYaml = dump({
      kind: 'alert',
      metadata: { name: 'Test Rule', enabled: true },
      time_field: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: { query: { base: 'FROM logs-*' } },
    });

    fireEvent.change(editor, { target: { value: validYaml } });

    // Submit the form using fireEvent.submit which wraps in act()
    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'alert',
          metadata: expect.objectContaining({
            name: 'Test Rule',
          }),
        })
      );
    });
  });

  it('displays error callout for invalid YAML', async () => {
    const onSubmit = jest.fn();

    render(<StatefulYamlRuleForm {...defaultProps} onSubmit={onSubmit} />, {
      wrapper: createFormWrapper(),
    });

    const editor = screen.getByRole('textbox', { name: 'YAML Editor' });

    // Enter invalid YAML using fireEvent
    fireEvent.change(editor, { target: { value: 'invalid: yaml\n  bad: indentation' } });

    // Submit the form using fireEvent.submit which wraps in act()
    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Configuration error')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('clears error when user starts editing', async () => {
    render(<StatefulYamlRuleForm {...defaultProps} />, {
      wrapper: createFormWrapper(),
    });

    const editor = screen.getByRole('textbox', { name: 'YAML Editor' });

    // Enter invalid YAML and submit to trigger error
    fireEvent.change(editor, { target: { value: 'invalid yaml' } });

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Configuration error')).toBeInTheDocument();
    });

    // Start editing - error should clear
    fireEvent.change(editor, { target: { value: 'invalid yaml more text' } });

    await waitFor(() => {
      expect(screen.queryByText('Configuration error')).not.toBeInTheDocument();
    });
  });

  describe('blur sync', () => {
    // Renders the current form's metadata.name so tests can observe whether
    // YAML→Form sync ran (it'll show the YAML's name) or didn't (initial name).
    const FormNameProbe = () => {
      const { getValues } = useFormContext();
      return <div data-test-subj="formNameProbe">{getValues('metadata.name') ?? ''}</div>;
    };

    it('applies parsed YAML values to form state on valid blur', async () => {
      const validYaml = dump({
        kind: 'alert',
        metadata: { name: 'Blurred Name', enabled: true },
        time_field: '@timestamp',
        schedule: { every: '5m', lookback: '1m' },
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      render(
        <>
          <StatefulYamlRuleForm {...defaultProps} initialYaml={validYaml} />
          <FormNameProbe />
        </>,
        { wrapper: createFormWrapper({ metadata: { name: 'Initial Name', enabled: true } }) }
      );

      // Sanity: form starts with the initial name
      expect(screen.getByTestId('formNameProbe')).toHaveTextContent('Initial Name');

      // Trigger blur on the YAML editor
      const editor = screen.getByRole('textbox', { name: 'YAML Editor' });
      act(() => {
        editor.focus();
        editor.blur();
      });

      await waitFor(() => {
        expect(screen.getByTestId('formNameProbe')).toHaveTextContent('Blurred Name');
      });
      expect(screen.queryByText('Configuration error')).not.toBeInTheDocument();
    });

    it('shows error and does not update form state on invalid blur', async () => {
      render(
        <>
          <StatefulYamlRuleForm {...defaultProps} initialYaml="invalid: yaml\n  bad: indentation" />
          <FormNameProbe />
        </>,
        { wrapper: createFormWrapper({ metadata: { name: 'Untouched', enabled: true } }) }
      );

      const editor = screen.getByRole('textbox', { name: 'YAML Editor' });
      act(() => {
        editor.focus();
        editor.blur();
      });

      await waitFor(() => {
        expect(screen.getByText('Configuration error')).toBeInTheDocument();
      });
      // Form state not touched
      expect(screen.getByTestId('formNameProbe')).toHaveTextContent('Untouched');
    });
  });
});
