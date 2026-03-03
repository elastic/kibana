/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { dump } from 'js-yaml';
import {
  YamlRuleForm,
  formValuesToYamlObject,
  parseYamlToFormValues,
  serializeFormToYaml,
} from './yaml_rule_form';
import { createFormWrapper, createMockServices, defaultTestFormValues } from '../test_utils';
import type { FormValues } from './types';

// Mock the yaml-rule-editor to avoid monaco editor setup
jest.mock('@kbn/yaml-rule-editor', () => ({
  YamlRuleEditor: ({
    value,
    onChange,
    isReadOnly,
    dataTestSubj,
  }: {
    value: string;
    onChange: (value: string) => void;
    isReadOnly?: boolean;
    dataTestSubj?: string;
  }) => (
    <textarea
      data-test-subj={dataTestSubj}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={isReadOnly}
      aria-label="YAML Editor"
    />
  ),
}));

// Mock ES|QL validation
jest.mock('@kbn/alerting-v2-schemas', () => ({
  validateEsqlQuery: (query: string) => {
    if (!query || query.includes('INVALID')) {
      return 'Invalid ES|QL query syntax';
    }
    return null;
  },
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

describe('yaml_rule_form utilities', () => {
  describe('formValuesToYamlObject', () => {
    it('converts FormValues to YAML-compatible object with snake_case keys', () => {
      const formValues: FormValues = {
        kind: 'alert',
        metadata: {
          name: 'Test Rule',
          enabled: true,
          description: 'A test rule',
          owner: 'test-owner',
          labels: ['label1', 'label2'],
        },
        timeField: '@timestamp',
        schedule: {
          every: '5m',
          lookback: '1m',
        },
        evaluation: {
          query: {
            base: 'FROM logs-* | LIMIT 10',
          },
        },
        grouping: {
          fields: ['host.name', 'service.name'],
        },
      };

      const result = formValuesToYamlObject(formValues);

      expect(result).toEqual({
        kind: 'alert',
        metadata: {
          name: 'Test Rule',
          enabled: true,
          description: 'A test rule',
          owner: 'test-owner',
          labels: ['label1', 'label2'],
        },
        time_field: '@timestamp',
        schedule: {
          every: '5m',
          lookback: '1m',
        },
        evaluation: {
          query: {
            base: 'FROM logs-* | LIMIT 10',
          },
        },
        grouping: {
          fields: ['host.name', 'service.name'],
        },
      });
    });

    it('excludes optional fields when not provided', () => {
      const formValues: FormValues = {
        kind: 'signal',
        metadata: {
          name: 'Minimal Rule',
          enabled: false,
        },
        timeField: '@timestamp',
        schedule: {
          every: '1m',
          lookback: '5m',
        },
        evaluation: {
          query: {
            base: 'FROM logs-*',
          },
        },
      };

      const result = formValuesToYamlObject(formValues);

      expect(result).toEqual({
        kind: 'signal',
        metadata: {
          name: 'Minimal Rule',
          enabled: false,
        },
        time_field: '@timestamp',
        schedule: {
          every: '1m',
          lookback: '5m',
        },
        evaluation: {
          query: {
            base: 'FROM logs-*',
          },
        },
      });
      expect(result).not.toHaveProperty('grouping');
      expect((result.metadata as Record<string, unknown>).description).toBeUndefined();
    });

    it('excludes empty grouping fields array', () => {
      const formValues: FormValues = {
        ...defaultTestFormValues,
        grouping: {
          fields: [],
        },
      };

      const result = formValuesToYamlObject(formValues);

      expect(result).not.toHaveProperty('grouping');
    });
  });

  describe('parseYamlToFormValues', () => {
    it('parses valid YAML to FormValues', () => {
      const yaml = dump({
        kind: 'alert',
        metadata: {
          name: 'Test Rule',
          enabled: true,
          description: 'A description',
        },
        time_field: '@timestamp',
        schedule: {
          every: '5m',
          lookback: '1m',
        },
        evaluation: {
          query: {
            base: 'FROM logs-*',
          },
        },
        grouping: {
          fields: ['host.name'],
        },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values).toEqual({
        kind: 'alert',
        metadata: {
          name: 'Test Rule',
          enabled: true,
          description: 'A description',
          owner: undefined,
          labels: undefined,
        },
        timeField: '@timestamp',
        schedule: {
          every: '5m',
          lookback: '1m',
        },
        evaluation: {
          query: {
            base: 'FROM logs-*',
          },
        },
        grouping: {
          fields: ['host.name'],
        },
      });
    });

    it('returns error for invalid YAML syntax', () => {
      const invalidYaml = 'kind: alert\n  invalid: indentation';

      const result = parseYamlToFormValues(invalidYaml);

      expect(result.values).toBeNull();
      expect(result.error).toContain('Invalid YAML syntax');
    });

    it('returns error for non-object YAML', () => {
      const arrayYaml = '- item1\n- item2';

      const result = parseYamlToFormValues(arrayYaml);

      expect(result.values).toBeNull();
      expect(result.error).toContain('YAML must be an object');
    });

    it('returns error for invalid kind value', () => {
      const yaml = dump({
        kind: 'invalid',
        metadata: { name: 'Test' },
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values).toBeNull();
      expect(result.error).toContain('Kind must be "alert" or "signal"');
    });

    it('returns error for missing name', () => {
      const yaml = dump({
        kind: 'alert',
        metadata: {},
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values).toBeNull();
      expect(result.error).toContain('metadata.name is required');
    });

    it('returns error for empty name', () => {
      const yaml = dump({
        kind: 'alert',
        metadata: { name: '   ' },
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values).toBeNull();
      expect(result.error).toContain('metadata.name is required');
    });

    it('returns error for missing query', () => {
      const yaml = dump({
        kind: 'alert',
        metadata: { name: 'Test' },
        evaluation: { query: {} },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values).toBeNull();
      expect(result.error).toContain('evaluation.query.base is required');
    });

    it('returns error for invalid ES|QL query', () => {
      const yaml = dump({
        kind: 'alert',
        metadata: { name: 'Test' },
        evaluation: { query: { base: 'INVALID query' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values).toBeNull();
      expect(result.error).toContain('Invalid ES|QL query syntax');
    });

    it('uses default values for missing optional fields', () => {
      const yaml = dump({
        metadata: { name: 'Minimal Rule' },
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.error).toBeNull();
      expect(result.values).toMatchObject({
        kind: 'alert',
        timeField: '@timestamp',
        schedule: {
          every: '5m',
          lookback: '1m',
        },
      });
    });

    it('defaults enabled to true when not specified', () => {
      const yaml = dump({
        metadata: { name: 'Test' },
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values?.metadata.enabled).toBe(true);
    });

    it('respects enabled: false', () => {
      const yaml = dump({
        metadata: { name: 'Test', enabled: false },
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values?.metadata.enabled).toBe(false);
    });

    it('trims whitespace from name', () => {
      const yaml = dump({
        metadata: { name: '  Test Rule  ' },
        evaluation: { query: { base: 'FROM logs-*' } },
      });

      const result = parseYamlToFormValues(yaml);

      expect(result.values?.metadata.name).toBe('Test Rule');
    });
  });

  describe('serializeFormToYaml', () => {
    it('serializes FormValues to YAML string', () => {
      const formValues: FormValues = {
        kind: 'alert',
        metadata: {
          name: 'Test',
          enabled: true,
        },
        timeField: '@timestamp',
        schedule: { every: '5m', lookback: '1m' },
        evaluation: { query: { base: 'FROM logs-*' } },
      };

      const yaml = serializeFormToYaml(formValues);

      expect(yaml).toContain('kind: alert');
      expect(yaml).toContain('name: Test');
      // js-yaml uses single quotes for strings containing special characters
      expect(yaml).toContain("time_field: '@timestamp'");
    });
  });
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

  it('renders the YAML editor with initial form values', () => {
    const Wrapper = createFormWrapper({
      metadata: { name: 'Initial Rule', enabled: true },
      evaluation: { query: { base: 'FROM logs-*' } },
    });

    render(
      <Wrapper>
        <YamlRuleForm {...defaultProps} />
      </Wrapper>
    );

    const editor = screen.getByRole('textbox', { name: 'YAML Editor' }) as HTMLTextAreaElement;
    expect(editor).toBeInTheDocument();
    expect(editor.value).toContain('Initial Rule');
  });

  it('renders the form label and help text', () => {
    render(<YamlRuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Rule definition (YAML)')).toBeInTheDocument();
    expect(
      screen.getByText(/Edit the rule as YAML. ES\|QL autocomplete is available/)
    ).toBeInTheDocument();
  });

  it('disables editor when isDisabled is true', () => {
    render(<YamlRuleForm {...defaultProps} isDisabled />, { wrapper: createFormWrapper() });

    const editor = screen.getByRole('textbox', { name: 'YAML Editor' });
    expect(editor).toBeDisabled();
  });

  it('disables editor when isSubmitting is true', () => {
    render(<YamlRuleForm {...defaultProps} isSubmitting />, { wrapper: createFormWrapper() });

    const editor = screen.getByRole('textbox', { name: 'YAML Editor' });
    expect(editor).toBeDisabled();
  });

  it('calls onSubmit with parsed values on valid submission', async () => {
    const onSubmit = jest.fn();

    render(<YamlRuleForm {...defaultProps} onSubmit={onSubmit} />, {
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

    render(<YamlRuleForm {...defaultProps} onSubmit={onSubmit} />, {
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

  it('displays error for missing required fields', async () => {
    const onSubmit = jest.fn();

    render(<YamlRuleForm {...defaultProps} onSubmit={onSubmit} />, {
      wrapper: createFormWrapper(),
    });

    const editor = screen.getByRole('textbox', { name: 'YAML Editor' });

    // Enter YAML without required name
    const yamlWithoutName = dump({
      kind: 'alert',
      metadata: {},
      evaluation: { query: { base: 'FROM logs-*' } },
    });

    fireEvent.change(editor, { target: { value: yamlWithoutName } });

    // Submit the form using fireEvent.submit which wraps in act()
    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Configuration error')).toBeInTheDocument();
      expect(screen.getByText(/metadata.name is required/)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('clears error when user starts editing', async () => {
    render(<YamlRuleForm {...defaultProps} />, {
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

  it('has correct data-test-subj attribute', () => {
    render(<YamlRuleForm {...defaultProps} />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('ruleV2FormYamlEditor')).toBeInTheDocument();
  });
});
