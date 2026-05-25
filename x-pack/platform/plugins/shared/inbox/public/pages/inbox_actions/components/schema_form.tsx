/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSwitch,
  EuiText,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import * as i18n from '../translations';

/**
 * Minimal JSON Schema shape the form renders in Phase 0. Aligns with the
 * must-have field-type matrix of HITL GA [security-team#16707](https://github.com/elastic/security-team/issues/16707):
 * string / number / boolean / enum (single-select) / array of enum (multi-select).
 *
 * This is intentionally a subset — when the Workflows + Agent Builder teams
 * publish a shared JSON-Schema-to-form component for [#16711](https://github.com/elastic/security-team/issues/16711),
 * this renderer can be replaced with a thin adapter.
 */
export interface InboxJsonSchema {
  type?: 'object';
  properties?: Record<string, InboxFieldSchema>;
  required?: string[];
}

export interface InboxFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'array';
  title?: string;
  description?: string;
  enum?: Array<string | number>;
  default?: unknown;
  items?: { type?: 'string' | 'number'; enum?: Array<string | number> };
}

export interface SchemaFormProps {
  schema: InboxJsonSchema | null | undefined;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  errors?: Record<string, string | undefined>;
  disabled?: boolean;
}

const describedField = ({
  name,
  field,
  isRequired,
  isSwitch,
  content,
  error,
}: {
  name: string;
  field: InboxFieldSchema;
  isRequired: boolean;
  // EuiSwitch carries its own label; EuiFormRow should not duplicate it.
  isSwitch: boolean;
  content: React.ReactNode;
  error: string | undefined;
}) => {
  // Fall back to the property name so every row has an accessible label
  // even when the schema omits `title`. Required fields get a trailing
  // asterisk (EuiFormRow has no dedicated `isRequired` prop).
  const rawLabel = field.title ?? name;
  const label = isRequired ? (
    <>
      {rawLabel}{' '}
      <span aria-hidden="true" style={{ color: 'var(--euiColorDanger, #BD271E)' }}>
        *
      </span>
    </>
  ) : (
    rawLabel
  );
  return (
    <EuiFormRow
      label={label}
      helpText={field.description}
      isInvalid={Boolean(error)}
      hasChildLabel={!isSwitch}
      error={error}
      fullWidth
    >
      {content as React.ReactElement}
    </EuiFormRow>
  );
};

const renderField = ({
  name,
  field,
  value,
  error,
  disabled,
  isRequired,
  onChange,
}: {
  name: string;
  field: InboxFieldSchema;
  value: unknown;
  error: string | undefined;
  disabled: boolean;
  isRequired: boolean;
  onChange: (next: unknown) => void;
}): React.ReactNode => {
  const placeholder = i18n.SELECT_PLACEHOLDER;
  const label = field.title ?? name;

  if (field.enum && field.enum.length > 0 && field.type !== 'array') {
    return describedField({
      name,
      field,
      isRequired,
      isSwitch: false,
      error,
      content: (
        <EuiSelect
          fullWidth
          isInvalid={Boolean(error)}
          disabled={disabled}
          options={[
            { value: '', text: placeholder },
            ...field.enum.map((choice) => ({ value: String(choice), text: String(choice) })),
          ]}
          value={value == null ? '' : String(value)}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === '') {
              onChange(undefined);
              return;
            }
            onChange(field.type === 'number' ? Number(raw) : raw);
          }}
          aria-label={label}
        />
      ),
    });
  }

  if (field.type === 'boolean') {
    return describedField({
      name,
      field,
      isRequired,
      isSwitch: true,
      error,
      content: (
        <EuiSwitch
          label={label}
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
      ),
    });
  }

  if (field.type === 'number') {
    return describedField({
      name,
      field,
      isRequired,
      isSwitch: false,
      error,
      content: (
        <EuiFieldNumber
          fullWidth
          isInvalid={Boolean(error)}
          disabled={disabled}
          value={typeof value === 'number' ? value : ''}
          onChange={(event) => {
            const raw = event.target.value;
            onChange(raw === '' ? undefined : Number(raw));
          }}
          aria-label={label}
        />
      ),
    });
  }

  if (field.type === 'array') {
    const itemEnum = field.items?.enum ?? [];
    const options: Array<EuiComboBoxOptionOption<string>> = itemEnum.map((choice) => ({
      label: String(choice),
      value: String(choice),
    }));
    const selected = Array.isArray(value)
      ? (value as Array<string | number>).map((choice) => ({
          label: String(choice),
          value: String(choice),
        }))
      : [];
    return describedField({
      name,
      field,
      isRequired,
      isSwitch: false,
      error,
      content: (
        <EuiComboBox<string>
          fullWidth
          isDisabled={disabled}
          isInvalid={Boolean(error)}
          options={options}
          selectedOptions={selected}
          onChange={(next) => onChange(next.map((option) => option.value ?? option.label))}
          aria-label={label}
        />
      ),
    });
  }

  return describedField({
    name,
    field,
    isRequired,
    isSwitch: false,
    error,
    content: (
      <EuiFieldText
        fullWidth
        isInvalid={Boolean(error)}
        disabled={disabled}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === '' ? undefined : raw);
        }}
        aria-label={label}
      />
    ),
  });
};

export const SchemaForm: React.FC<SchemaFormProps> = ({
  schema,
  values,
  onChange,
  errors = {},
  disabled = false,
}) => {
  const properties = useMemo(() => Object.entries(schema?.properties ?? {}), [schema]);
  const requiredSet = useMemo(() => new Set(schema?.required ?? []), [schema]);

  if (!schema || properties.length === 0) {
    return (
      <EuiText color="subdued" size="s">
        <p>{i18n.FLYOUT_NO_SCHEMA_BODY}</p>
      </EuiText>
    );
  }

  return (
    <>
      {properties.map(([name, field]) => (
        <React.Fragment key={name}>
          {renderField({
            name,
            field,
            value: values[name],
            error: errors[name],
            disabled,
            isRequired: requiredSet.has(name),
            onChange: (next) => {
              const nextValues = { ...values };
              if (next === undefined) {
                delete nextValues[name];
              } else {
                nextValues[name] = next;
              }
              onChange(nextValues);
            },
          })}
        </React.Fragment>
      ))}
    </>
  );
};

/**
 * Pulls `default` values from a schema's properties. Used by the flyout to
 * seed the form when it opens (aligns with #16707 Scenario 2).
 */
export const extractSchemaDefaults = (
  schema: InboxJsonSchema | null | undefined
): Record<string, unknown> => {
  if (!schema?.properties) return {};
  return Object.fromEntries(
    Object.entries(schema.properties)
      .filter(([, field]) => field.default !== undefined)
      .map(([name, field]) => [name, field.default])
  );
};

/**
 * Lightweight synchronous validator covering the subset of JSON Schema we
 * render. Returns a map of `fieldName -> error message` for any violations.
 */
export const validateSchemaValues = (
  schema: InboxJsonSchema | null | undefined,
  values: Record<string, unknown>
): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!schema) return errors;
  for (const name of schema.required ?? []) {
    const value = values[name];
    const field = schema.properties?.[name];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value === '') ||
      (Array.isArray(value) && value.length === 0);
    if (missing && field?.type !== 'boolean') {
      errors[name] = i18n.REQUIRED_FIELD_ERROR;
    }
  }
  return errors;
};
