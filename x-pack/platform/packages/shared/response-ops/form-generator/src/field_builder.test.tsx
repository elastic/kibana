/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { z } from '@kbn/zod/v4';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  Form,
  useForm,
  type ValidationFunc,
  type ValidationError,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getFieldFromSchema, getFieldsFromSchema, renderField } from './field_builder';
import type { FormConfig } from './form';
import { addMeta } from './schema_connector_metadata';
import { getWidgetComponent } from './widgets';

jest.mock('./widgets', () => {
  const module = jest.requireActual('./widgets');
  return {
    ...module,
    getWidgetComponent: jest.fn(module.getWidgetComponent),
  };
});

const getWidgetComponentMock = getWidgetComponent as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const TestFormWrapper = ({ children }: { children: React.ReactNode }) => {
  const { form } = useForm();
  return <Form form={form}>{children}</Form>;
};

const createValidationArg = (value: any, path: string): Parameters<ValidationFunc>[0] => ({
  value,
  path,
  form: {} as any,
  formData: {} as any,
  errors: [] as const,
  customData: { provider: async () => {}, value: undefined },
});

describe('Field Builder', () => {
  describe('getFieldFromSchema', () => {
    const formConfig: FormConfig = {};

    it('should create proper FieldDefinition with all required properties', () => {
      const schema = z.string();
      const path = 'username';

      const field = getFieldFromSchema({ schema, path, formConfig });

      expect(field).toHaveProperty('path');
      expect(field).toHaveProperty('schema');
      expect(field).toHaveProperty('formConfig');
      expect(field).toHaveProperty('validate');
      expect(field.path).toBe(path);
      expect(field.formConfig).toBe(formConfig);
      expect(typeof field.validate).toBe('function');
    });

    it('should extract schema correctly from wrapped schema', () => {
      const innerSchema = z.string();
      const wrappedSchema = innerSchema.optional();
      const path = 'field';

      const field = getFieldFromSchema({ schema: wrappedSchema, path, formConfig });

      expect(field.schema).toBeInstanceOf(z.ZodString);
    });

    it('should include defaultValue when schema has default', () => {
      const schema = z.string().default('default-value');
      const path = 'field';

      const field = getFieldFromSchema({ schema, path, formConfig });

      expect(field.defaultValue).toBe('default-value');
    });

    it('should not include defaultValue when schema has no default', () => {
      const schema = z.string();
      const path = 'field';

      const field = getFieldFromSchema({ schema, path, formConfig });

      expect(field.defaultValue).toBeUndefined();
    });

    it('should create validation function that can be called', () => {
      const schema = z.string().min(3);
      const path = 'field';

      const field = getFieldFromSchema({ schema, path, formConfig });
      const result = field.validate(createValidationArg('test', path));

      expect(result).toBeUndefined();
    });
  });

  describe('getFieldsFromSchema', () => {
    const formConfig: FormConfig = {};

    it('should handle multiple fields correctly', () => {
      const schema = z.object({
        username: z.string(),
        email: z.string(),
        age: z.number(),
      });

      const fields = getFieldsFromSchema({ schema, formConfig });

      expect(fields).toHaveLength(3);
      expect(fields[0].path).toBe('username');
      expect(fields[1].path).toBe('email');
      expect(fields[2].path).toBe('age');
    });

    it('should generate correct paths without rootPath parameter', () => {
      const schema = z.object({
        field1: z.string(),
        field2: z.number(),
      });

      const fields = getFieldsFromSchema({ schema, formConfig });

      expect(fields[0].path).toBe('field1');
      expect(fields[1].path).toBe('field2');
    });

    it('should generate correct dot-notated paths with rootPath parameter', () => {
      const schema = z.object({
        field1: z.string(),
        field2: z.number(),
      });

      const fields = getFieldsFromSchema({ schema, rootPath: 'parent', formConfig });

      expect(fields[0].path).toBe('parent.field1');
      expect(fields[1].path).toBe('parent.field2');
    });

    it('should generate correct nested dot-notated paths with multiple levels', () => {
      const schema = z.object({
        field1: z.string(),
      });

      const fields = getFieldsFromSchema({ schema, rootPath: 'level1.level2', formConfig });

      expect(fields[0].path).toBe('level1.level2.field1');
    });

    it('should create field definitions with correct schemas', () => {
      const schema = z.object({
        username: z.string(),
        count: z.number(),
      });

      const fields = getFieldsFromSchema({ schema, formConfig });

      expect(fields[0].schema).toBeInstanceOf(z.ZodString);
      expect(fields[1].schema).toBeInstanceOf(z.ZodNumber);
    });
  });

  describe('validation function', () => {
    const formConfig: FormConfig = {};

    it('should return undefined for valid values', () => {
      const schema = z.string().min(3);
      const path = 'field';

      const field = getFieldFromSchema({ schema, path, formConfig });
      const result = field.validate(createValidationArg('valid-string', path));

      expect(result).toBeUndefined();
    });

    it('should return error object for invalid values', () => {
      const schema = z.string().min(5);
      const path = 'field';

      const field = getFieldFromSchema({ schema, path, formConfig });
      const result = field.validate(createValidationArg('ab', path)) as ValidationError;

      expect(result).toBeDefined();
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('path');
      expect(typeof result.message).toBe('string');
    });

    it('should include path in error object', () => {
      const schema = z.string().min(5);
      const path = 'username';

      const field = getFieldFromSchema({ schema, path, formConfig });
      const result = field.validate(createValidationArg('ab', path)) as ValidationError;

      expect(result?.path).toBe(path);
    });

    it('should extract error message from ZodError', () => {
      const schema = z.string().min(5, { message: 'Must be at least 5 characters' });
      const path = 'field';

      const field = getFieldFromSchema({ schema, path, formConfig });
      const result = field.validate(createValidationArg('ab', path)) as ValidationError;

      expect(result?.message).toContain('Must be at least 5 characters');
    });

    it('should join multiple Zod issue messages with comma', () => {
      const schema = z
        .string()
        .min(5, { message: 'Too short A' })
        .min(6, { message: 'Too short B' });
      const path = 'field';

      const field = getFieldFromSchema({ schema, path, formConfig });
      const result = field.validate(createValidationArg('aa', path)) as ValidationError;

      expect(result?.message).toContain('Too short A');
      expect(result?.message).toContain('Too short B');
      expect(result?.message).toContain(',');
    });

    it('should extract all issue messages from ZodError', () => {
      const schema = z.string().refine(() => false, { message: 'First validation failed' });
      const path = 'field';

      const field = getFieldFromSchema({ schema, path, formConfig });
      const result = field.validate(createValidationArg('test', path)) as ValidationError;

      expect(result?.message).toContain('First validation failed');
    });
  });

  describe('renderField', () => {
    const formConfig: FormConfig = {};

    it('should create React elements', () => {
      const schema = z.string();
      addMeta(schema, { label: 'Test Field' });
      const path = 'testField';

      const field = getFieldFromSchema({ schema, path, formConfig });
      const element = renderField({ field });

      expect(React.isValidElement(element)).toBe(true);
    });

    it('should render field with correct label and props', () => {
      const schema = z.string();
      addMeta(schema, { label: 'Username', placeholder: 'Enter username' });
      const path = 'username';

      const field = getFieldFromSchema({ schema, path, formConfig });
      const element = renderField({ field });

      render(<TestFormWrapper>{element}</TestFormWrapper>, { wrapper });

      expect(screen.getByText('Username')).toBeDefined();
      expect(screen.getByPlaceholderText('Enter username')).toBeDefined();
    });

    it('should pass correct props to widget including path', () => {
      const schema = z.string();
      addMeta(schema, { label: 'Test Field' });
      const path = 'testPath';

      const field = getFieldFromSchema({ schema, path, formConfig });
      const element = renderField({ field });

      render(<TestFormWrapper>{element}</TestFormWrapper>, { wrapper });

      const input = screen.getByTestId('generator-field-testPath');
      expect(input).toBeDefined();
      expect(screen.getByText('Test Field')).toBeDefined();
      expect(input.tagName).toBe('INPUT');
    });

    it('should pass defaultValue to widget', () => {
      const schema = z.string().default('default-value');
      addMeta(schema, { label: 'Test Field' });
      const path = 'testField';

      const field = getFieldFromSchema({ schema, path, formConfig });
      const element = renderField({ field });

      render(<TestFormWrapper>{element}</TestFormWrapper>, { wrapper });

      const input = screen.getByTestId('generator-field-testField') as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.value).toBe('default-value');
    });

    it('should set correct data-test-subj with simple path', () => {
      const schema = z.string();
      addMeta(schema, { label: 'Test Field' });
      const path = 'username';

      const field = getFieldFromSchema({ schema, path, formConfig });
      const element = renderField({ field });

      render(<TestFormWrapper>{element}</TestFormWrapper>, { wrapper });

      const input = screen.getByTestId('generator-field-username');
      expect(input).toBeDefined();
    });

    it('should set correct data-test-subj with dot-notated path', () => {
      const schema = z.string();
      addMeta(schema, { label: 'Test Field' });
      const path = 'root.field';

      const field = getFieldFromSchema({ schema, path, formConfig });
      const element = renderField({ field });

      render(<TestFormWrapper>{element}</TestFormWrapper>, { wrapper });

      const input = screen.getByTestId('generator-field-root-field');
      expect(input).toBeDefined();
    });

    it('should pass formConfig disabled to widget', () => {
      const disabledConfig: FormConfig = { disabled: true };
      const schema = z.string();
      addMeta(schema, { label: 'Test Field' });
      const path = 'testField';

      const field = getFieldFromSchema({ schema, path, formConfig: disabledConfig });
      const element = renderField({ field });

      render(<TestFormWrapper>{element}</TestFormWrapper>, { wrapper });

      const input = screen.getByTestId('generator-field-testField') as HTMLInputElement;
      expect(input).toBeDisabled();
    });

    it('should pass schema meta disabled to widget', () => {
      const schema = z.string();
      addMeta(schema, { label: 'Test Field', disabled: true });
      const path = 'testField';

      const field = getFieldFromSchema({ schema, path, formConfig });
      const element = renderField({ field });

      render(<TestFormWrapper>{element}</TestFormWrapper>, { wrapper });

      const input = screen.getByTestId('generator-field-testField') as HTMLInputElement;
      expect(input).toBeDisabled();
    });

    it('should render helpText when provided in meta', () => {
      const schema = z.string();
      addMeta(schema, { label: 'Test Field', helpText: 'This is helpful text' });
      const path = 'testField';

      const field = getFieldFromSchema({ schema, path, formConfig });
      const element = renderField({ field });

      render(<TestFormWrapper>{element}</TestFormWrapper>, { wrapper });

      expect(screen.getByText('This is helpful text')).toBeDefined();
    });
  });
});

describe('mocked getWidgetComponent', () => {
  const formConfig: FormConfig = { isEdit: true };
  const mockWidgetComponent = jest.fn((props) => {
    return <div data-testid="mock-widget" />;
  });

  beforeAll(() => {
    getWidgetComponentMock.mockReturnValue(mockWidgetComponent);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass correct props structure to WidgetComponent', () => {
    const schema = z.string().default('default-value').meta({
      label: 'Username Label',
      placeholder: 'Enter your username',
      helpText: 'This is help text',
      disabled: true,
    });

    const path = 'username';

    const field = getFieldFromSchema({ schema, path, formConfig });
    render(renderField({ field }));

    expect(mockWidgetComponent).toHaveBeenCalledTimes(1);

    const receivedProps = mockWidgetComponent.mock.calls[0][0];

    expect(receivedProps.path).toBe('username');
    expect(receivedProps.formConfig).toBe(formConfig);

    expect(receivedProps.fieldConfig).toBeDefined();
    expect(receivedProps.fieldConfig.label).toBe('Username Label');
    expect(receivedProps.fieldConfig.defaultValue).toBe('default-value');
    expect(receivedProps.fieldConfig.validations).toHaveLength(1);
    expect(typeof receivedProps.fieldConfig.validations[0].validator).toBe('function');

    expect(receivedProps.fieldProps).toBeDefined();
    expect(receivedProps.fieldProps.helpText).toBe('This is help text');
    expect(receivedProps.fieldProps.fullWidth).toBe(true);
    expect(receivedProps.fieldProps.labelAppend).toBeNull();

    expect(receivedProps.fieldProps.euiFieldProps).toBeDefined();
    expect(receivedProps.fieldProps.euiFieldProps.placeholder).toBe('Enter your username');
    expect(receivedProps.fieldProps.euiFieldProps.disabled).toBe(true);
    expect(receivedProps.fieldProps.euiFieldProps['data-test-subj']).toBe(
      'generator-field-username'
    );
  });
});
