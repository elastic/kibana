/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  SchemaForm,
  extractSchemaDefaults,
  validateSchemaValues,
  type InboxJsonSchema,
} from './schema_form';

const SCHEMA: InboxJsonSchema = {
  type: 'object',
  properties: {
    approved: { type: 'boolean', title: 'Approved', default: true },
    reason: { type: 'string', title: 'Reason' },
    severity: { type: 'string', title: 'Severity', enum: ['low', 'high'], default: 'low' },
    count: { type: 'number', title: 'Count' },
    tags: { type: 'array', items: { type: 'string', enum: ['a', 'b'] } },
  },
  required: ['approved', 'reason', 'severity'],
};

const renderForm = (
  schema: InboxJsonSchema | null | undefined,
  values: Record<string, unknown> = {},
  onChange = jest.fn(),
  errors: Record<string, string | undefined> = {},
  disabled = false
) =>
  render(
    <IntlProvider>
      <SchemaForm
        disabled={disabled}
        errors={errors}
        onChange={onChange}
        schema={schema}
        values={values}
      />
    </IntlProvider>
  );

// ─── extractSchemaDefaults ───────────────────────────────────────────────────

describe('extractSchemaDefaults', () => {
  it('returns an empty object for null/empty schemas', () => {
    expect(extractSchemaDefaults(null)).toEqual({});
    expect(extractSchemaDefaults(undefined)).toEqual({});
    expect(extractSchemaDefaults({ type: 'object' })).toEqual({});
  });

  it('pulls declared defaults but ignores fields without a default', () => {
    expect(extractSchemaDefaults(SCHEMA)).toEqual({
      approved: true,
      severity: 'low',
    });
  });
});

// ─── validateSchemaValues ────────────────────────────────────────────────────

describe('validateSchemaValues', () => {
  it('returns an empty error map when nothing is required', () => {
    expect(validateSchemaValues({ type: 'object', properties: {} }, {})).toEqual({});
  });

  it('flags missing required non-boolean fields', () => {
    const errors = validateSchemaValues(SCHEMA, { approved: true });

    expect(errors).toEqual({
      reason: expect.any(String),
      severity: expect.any(String),
    });
  });

  it('treats empty strings and empty arrays as missing', () => {
    const errors = validateSchemaValues(SCHEMA, {
      approved: true,
      reason: '',
      severity: '',
      tags: [],
    });

    expect(errors.reason).toBeDefined();
    expect(errors.severity).toBeDefined();
    expect(errors.tags).toBeUndefined();
  });

  it('does not flag required booleans as missing when explicitly false', () => {
    const errors = validateSchemaValues(SCHEMA, {
      approved: false,
      reason: 'looks fine',
      severity: 'low',
    });

    expect(errors).toEqual({});
  });

  it('passes when all required fields are satisfied', () => {
    expect(
      validateSchemaValues(SCHEMA, {
        approved: true,
        reason: 'yes',
        severity: 'high',
      })
    ).toEqual({});
  });
});

// ─── SchemaForm rendering ────────────────────────────────────────────────────

describe('SchemaForm', () => {
  it('renders a no-schema message when schema is null', () => {
    renderForm(null);

    expect(screen.getByText(/does not declare an input schema/i)).toBeInTheDocument();
  });

  it('renders a no-schema message when schema has no properties', () => {
    renderForm({ type: 'object', properties: {} });

    expect(screen.getByText(/does not declare an input schema/i)).toBeInTheDocument();
  });

  it('renders a text field for string type', () => {
    renderForm({ type: 'object', properties: { reason: { type: 'string', title: 'Reason' } } });

    expect(screen.getByRole('textbox', { name: /reason/i })).toBeInTheDocument();
  });

  it('renders a number field for number type', () => {
    renderForm({ type: 'object', properties: { count: { type: 'number', title: 'Count' } } });

    expect(screen.getByRole('spinbutton', { name: /count/i })).toBeInTheDocument();
  });

  it('renders a boolean toggle for boolean type', () => {
    renderForm(
      { type: 'object', properties: { approved: { type: 'boolean', title: 'Approved' } } },
      { approved: false }
    );

    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('renders a select dropdown for string enum type', () => {
    renderForm({
      type: 'object',
      properties: { severity: { type: 'string', title: 'Severity', enum: ['low', 'high'] } },
    });

    expect(screen.getByRole('option', { name: 'low' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'high' })).toBeInTheDocument();
  });

  it('renders a combo box for array type with enum items', () => {
    renderForm({
      type: 'object',
      properties: { tags: { type: 'array', title: 'Tags', items: { enum: ['a', 'b'] } } },
    });

    expect(screen.getByRole('combobox', { name: /tags/i })).toBeInTheDocument();
  });

  it('calls onChange with updated values when text field changes', () => {
    const onChange = jest.fn();
    renderForm(
      { type: 'object', properties: { reason: { type: 'string', title: 'Reason' } } },
      {},
      onChange
    );

    fireEvent.change(screen.getByRole('textbox', { name: /reason/i }), {
      target: { value: 'test reason' },
    });

    expect(onChange).toHaveBeenCalledWith({ reason: 'test reason' });
  });

  it('calls onChange with undefined when text field is cleared', () => {
    const onChange = jest.fn();
    renderForm(
      { type: 'object', properties: { reason: { type: 'string', title: 'Reason' } } },
      { reason: 'existing' },
      onChange
    );

    fireEvent.change(screen.getByRole('textbox', { name: /reason/i }), {
      target: { value: '' },
    });

    expect(onChange).toHaveBeenCalledWith({});
  });

  it('calls onChange with boolean when toggle changes', () => {
    const onChange = jest.fn();
    renderForm(
      { type: 'object', properties: { approved: { type: 'boolean', title: 'Approved' } } },
      { approved: false },
      onChange
    );

    fireEvent.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledWith({ approved: true });
  });

  it('displays error message for invalid field', () => {
    renderForm(
      { type: 'object', properties: { reason: { type: 'string', title: 'Reason' } } },
      {},
      jest.fn(),
      { reason: 'This field is required' }
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('disables all fields when disabled prop is true', () => {
    renderForm(
      { type: 'object', properties: { reason: { type: 'string', title: 'Reason' } } },
      {},
      jest.fn(),
      {},
      true
    );

    expect(screen.getByRole('textbox', { name: /reason/i })).toBeDisabled();
  });

  it('renders a required asterisk for required fields', () => {
    renderForm(
      {
        type: 'object',
        properties: { reason: { type: 'string', title: 'Reason' } },
        required: ['reason'],
      },
      {}
    );

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('calls onChange with a number when number field changes', () => {
    const onChange = jest.fn();
    renderForm(
      { type: 'object', properties: { count: { type: 'number', title: 'Count' } } },
      {},
      onChange
    );

    fireEvent.change(screen.getByRole('spinbutton', { name: /count/i }), {
      target: { value: '42' },
    });

    expect(onChange).toHaveBeenCalledWith({ count: 42 });
  });

  it('renders multiple fields from the schema', () => {
    renderForm(SCHEMA, {});

    expect(screen.getByRole('textbox', { name: /reason/i })).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /count/i })).toBeInTheDocument();
  });

  it('renders agent_context reasoning and intended_tool as a callout above the input fields', () => {
    render(
      <IntlProvider>
        <SchemaForm
          agent_context={{
            intended_tool: 'approval.tool',
            intended_tool_args: {},
            reasoning: 'Agent thinks this needs approval',
          }}
          disabled={false}
          errors={{}}
          onChange={jest.fn()}
          schema={{
            type: 'object',
            properties: { approved: { type: 'boolean', title: 'Approved' } },
          }}
          values={{}}
        />
      </IntlProvider>
    );

    expect(screen.getByText(/Agent thinks this needs approval/)).toBeInTheDocument();
    expect(screen.getByText(/approval\.tool/)).toBeInTheDocument();
  });

  it('does not render agent_context callout when agent_context is absent', () => {
    renderForm(
      { type: 'object', properties: { approved: { type: 'boolean', title: 'Approved' } } },
      {}
    );

    expect(screen.queryByTestId('agentContextCallout')).not.toBeInTheDocument();
  });
});
