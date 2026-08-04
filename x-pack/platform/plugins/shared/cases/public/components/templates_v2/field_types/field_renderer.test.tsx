/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { parse as parseYaml } from 'yaml';
import { render, renderHook, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import {
  FieldType,
  type InlineField,
  isInlineField,
} from '../../../../common/types/domain/template/fields';
import { getFieldSnakeKey } from '../../../../common/utils';
import { buildInitialDefaultValues, FieldsRenderer, TemplateFieldRenderer } from './field_renderer';
import { controlRegistry } from './field_types_registry';

jest.mock('../../field_library/hooks/use_resolved_fields', () => ({
  useResolvedFields: (fields: Array<Record<string, unknown>>) => ({
    // Inline fields have `control`; ref fields have `$ref` without `control`
    resolvedFields: fields.filter((f) => 'control' in f),
    isLoading: false,
  }),
}));

jest.mock('../../cases_context/use_cases_context', () => ({
  useCasesContext: () => ({ owner: ['cases'] }),
}));

/**
 * Template with a required field whose show_when condition is false by default
 * (controller starts empty, not equal to 'yes').
 */
const templateWithHiddenRequired = `
name: Test
fields:
  - name: controller
    control: INPUT_TEXT
    type: keyword
    label: Controller
  - name: hidden_required
    control: INPUT_TEXT
    type: keyword
    label: Hidden Required
    validation:
      required: true
    display:
      show_when:
        field: controller
        operator: eq
        value: 'yes'
`;

const FormWrapper: React.FC<{
  templateDef: string;
  onSubmitResult: (isValid: boolean) => void;
}> = ({ templateDef, onSubmitResult }) => {
  const parseResult = ParsedTemplateDefinitionSchema.safeParse(parseYaml(templateDef));

  const form = useForm({
    defaultValues: { [CASE_EXTENDED_FIELDS]: {} },
  });

  if (!parseResult.success) {
    return <>{`Invalid template: ${parseResult.error}`}</>;
  }

  const resolvedFields = parseResult.data.fields.filter(isInlineField);

  const handleSubmit = form.handleSubmit(
    () => onSubmitResult(true),
    () => onSubmitResult(false)
  );

  return (
    <FormProvider {...form}>
      <FieldsRenderer resolvedFields={resolvedFields} />
      <button type="button" onClick={handleSubmit}>
        {'Submit'}
      </button>
    </FormProvider>
  );
};

const radioTemplate = `
name: Test
fields:
  - name: environment
    control: RADIO_GROUP
    type: keyword
    label: Environment
    metadata:
      options:
        - development
        - staging
        - production
      default: production
  - name: affected_components
    control: CHECKBOX_GROUP
    type: keyword
    label: Affected components
    metadata:
      options:
        - api
        - ui
        - database
      default: []
    display:
      show_when:
        field: environment
        operator: eq
        value: staging
`;

const parseParsedTemplate = (yaml: string) => {
  const result = ParsedTemplateDefinitionSchema.safeParse(parseYaml(yaml));
  if (!result.success) throw new Error(`Invalid template: ${result.error}`);
  return result.data;
};

/**
 * Hook that exposes the stable-fields stabilization logic from TemplateFieldRenderer
 * for isolated unit testing.
 */
const useStableFields = (fields: ReturnType<typeof parseParsedTemplate>['fields']) => {
  const fieldsKey = fields.map((f) => JSON.stringify(f)).join('|');
  const stableFieldsRef = React.useRef(fields);
  const prevKeyRef = React.useRef(fieldsKey);
  if (prevKeyRef.current !== fieldsKey) {
    prevKeyRef.current = fieldsKey;
    stableFieldsRef.current = fields;
  }
  return stableFieldsRef.current;
};

describe('buildInitialDefaultValues', () => {
  it('seeds a default for each value-holding field', () => {
    const fields = [
      { name: 'priority', type: 'keyword', control: 'INPUT_TEXT', metadata: { default: 'low' } },
      { name: 'score', type: 'long', control: 'INPUT_NUMBER', metadata: { default: 3 } },
    ] as unknown as InlineField[];

    const defaults = buildInitialDefaultValues(fields);

    expect(defaults[CASE_EXTENDED_FIELDS]).toEqual({
      priority_as_keyword: 'low',
      score_as_long: '3',
    });
  });

  it('excludes display-only (MARKDOWN) fields so they never seed an extended_fields key', () => {
    const fields = [
      {
        name: 'instructions',
        type: 'keyword',
        control: 'MARKDOWN',
        metadata: { content: 'Follow these steps.' },
      },
      { name: 'priority', type: 'keyword', control: 'INPUT_TEXT', metadata: { default: 'low' } },
    ] as unknown as InlineField[];

    const defaults = buildInitialDefaultValues(fields);

    expect(defaults[CASE_EXTENDED_FIELDS]).not.toHaveProperty('instructions_as_keyword');
    expect(defaults[CASE_EXTENDED_FIELDS]).toEqual({ priority_as_keyword: 'low' });
  });
});

describe('TemplateFieldRenderer — stable fields reference', () => {
  it('returns the same reference when re-rendered with a new but identical fields array', () => {
    const parsedTemplate = parseParsedTemplate(radioTemplate);

    const { result, rerender } = renderHook(({ fields }) => useStableFields(fields), {
      initialProps: { fields: parsedTemplate.fields },
    });

    const firstRef = result.current;

    // Re-parse the same YAML — produces a new object/array with identical content
    const identicalParsedTemplate = parseParsedTemplate(radioTemplate);
    expect(identicalParsedTemplate.fields).not.toBe(parsedTemplate.fields); // confirm new reference

    rerender({ fields: identicalParsedTemplate.fields });

    // stableFields reference must NOT change — same content, same ref
    expect(result.current).toBe(firstRef);
  });

  it('returns a new reference when the field default genuinely changes', () => {
    const parsedTemplate = parseParsedTemplate(radioTemplate);

    const { result, rerender } = renderHook(({ fields }) => useStableFields(fields), {
      initialProps: { fields: parsedTemplate.fields },
    });

    const firstRef = result.current;

    // Change the default from 'production' to 'staging'
    const updatedTemplate = parseParsedTemplate(
      radioTemplate.replace('default: production', 'default: staging')
    );

    rerender({ fields: updatedTemplate.fields });

    // stableFields reference MUST change — content changed
    expect(result.current).not.toBe(firstRef);
    expect(result.current).toBe(updatedTemplate.fields);
  });

  it('returns a new reference when a field is added', () => {
    const parsedTemplate = parseParsedTemplate(radioTemplate);

    const { result, rerender } = renderHook(({ fields }) => useStableFields(fields), {
      initialProps: { fields: parsedTemplate.fields },
    });

    const firstRef = result.current;

    const templateWithExtraField = parseParsedTemplate(
      `${radioTemplate}
  - name: extra_field
    control: INPUT_TEXT
    type: keyword
    label: Extra
`
    );

    rerender({ fields: templateWithExtraField.fields });

    expect(result.current).not.toBe(firstRef);
  });

  it('does not call onFieldDefaultChange when TemplateFieldRenderer re-renders with identical field definitions', async () => {
    const onFieldDefaultChange = jest.fn();
    const parsedTemplate = parseParsedTemplate(radioTemplate);

    const { rerender } = render(
      <TemplateFieldRenderer
        parsedTemplate={parsedTemplate}
        owner="securitySolution"
        onFieldDefaultChange={onFieldDefaultChange}
      />
    );

    // Let the initial sync and setTimeout(0) settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    onFieldDefaultChange.mockClear();

    // Simulate TemplatePreview re-parsing the same YAML — new object, same content
    const identicalParsedTemplate = parseParsedTemplate(radioTemplate);
    expect(identicalParsedTemplate.fields).not.toBe(parsedTemplate.fields);

    rerender(
      <TemplateFieldRenderer
        parsedTemplate={identicalParsedTemplate}
        owner="securitySolution"
        onFieldDefaultChange={onFieldDefaultChange}
      />
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // The YAML-to-form sync effect must NOT fire — stableFields ref is unchanged
    expect(onFieldDefaultChange).not.toHaveBeenCalled();
  });
});

describe('FieldsRenderer — hidden required fields', () => {
  it('does not block form submission when a required field is hidden by show_when', async () => {
    const onSubmitResult = jest.fn();

    render(
      <FormWrapper templateDef={templateWithHiddenRequired} onSubmitResult={onSubmitResult} />
    );

    // The hidden_required field is not rendered because controller !== 'yes'
    expect(screen.queryByText('Hidden Required')).not.toBeInTheDocument();

    // Submit the form — the hidden required field must not block submission
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(onSubmitResult).toHaveBeenCalledWith(true);
    });
  });

  it('blocks form submission when a required field is visible', async () => {
    const onSubmitResult = jest.fn();

    render(
      <FormWrapper templateDef={templateWithHiddenRequired} onSubmitResult={onSubmitResult} />
    );

    // Type 'yes' into the controller input to satisfy the show_when condition
    const controllerInput = screen.getByLabelText('Controller');
    await userEvent.type(controllerInput, 'yes');

    // The hidden_required field should now be visible
    await waitFor(() => {
      expect(screen.getByText('Hidden Required')).toBeInTheDocument();
    });

    // Submit without filling in the required field — should be blocked
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(onSubmitResult).toHaveBeenCalledWith(false);
    });
  });
});

describe('FieldsRenderer — field isolation', () => {
  const fields: InlineField[] = [
    { name: 'first', control: FieldType.INPUT_TEXT, type: 'keyword' },
    { name: 'second', control: FieldType.INPUT_TEXT, type: 'keyword' },
  ];
  const renderCounts: Record<string, number> = {};
  const originalInputText = controlRegistry[FieldType.INPUT_TEXT];

  const TestControl: React.FC<{
    name: string;
    type: string;
    onConfirm?: () => void;
  }> = ({ name, type, onConfirm }) => {
    renderCounts[name] = (renderCounts[name] ?? 0) + 1;
    const { register } = useFormContext();
    const path = `${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(name, type)}`;

    return (
      <>
        <input aria-label={name} {...register(path)} />
        {onConfirm && (
          <button type="button" onClick={onConfirm}>
            {`Confirm ${name}`}
          </button>
        )}
      </>
    );
  };

  const TestForm: React.FC<{
    onFieldConfirm?: (fieldName: string, fieldType: string) => void;
  }> = ({ onFieldConfirm }) => {
    const form = useForm({
      defaultValues: {
        [CASE_EXTENDED_FIELDS]: {
          first_as_keyword: '',
          second_as_keyword: '',
        },
      },
    });

    return (
      <FormProvider {...form}>
        <FieldsRenderer resolvedFields={fields} onFieldConfirm={onFieldConfirm} />
      </FormProvider>
    );
  };

  beforeEach(() => {
    renderCounts.first = 0;
    renderCounts.second = 0;
    controlRegistry[FieldType.INPUT_TEXT] = TestControl as typeof originalInputText;
  });

  afterEach(() => {
    controlRegistry[FieldType.INPUT_TEXT] = originalInputText;
  });

  it('does not re-render a sibling control when a field value changes', async () => {
    render(<TestForm />);
    renderCounts.first = 0;
    renderCounts.second = 0;

    await userEvent.type(screen.getByRole('textbox', { name: 'first' }), 'updated');

    expect(renderCounts.first).toBeGreaterThan(0);
    expect(renderCounts.second).toBe(0);
  });

  it('binds confirmation to the field name and type', async () => {
    const onFieldConfirm = jest.fn();
    render(<TestForm onFieldConfirm={onFieldConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: 'Confirm second' }));

    expect(onFieldConfirm).toHaveBeenCalledWith('second', 'keyword');
  });

  it('does not expose confirmation when no handler is provided', () => {
    render(<TestForm />);

    expect(screen.queryByRole('button', { name: /Confirm/ })).not.toBeInTheDocument();
  });
});

describe('FieldsRenderer — required-on-close label', () => {
  const templateWithRequirementLabels = `
name: Test
fields:
  - name: optional_field
    control: INPUT_TEXT
    type: keyword
    label: Optional Field
  - name: close_field
    control: INPUT_TEXT
    type: keyword
    label: Close Field
    validation:
      required_on_close: true
`;

  it('labels a required_on_close field "Required on close" instead of "Optional"', () => {
    render(<FormWrapper templateDef={templateWithRequirementLabels} onSubmitResult={jest.fn()} />);

    // The plain optional field keeps the "Optional" label.
    const optionalField = within(screen.getByTestId('template-field-optional_field'));
    expect(optionalField.getByTestId('form-optional-field-label')).toBeInTheDocument();

    // The required-on-close field shows "Required on close" and NOT "Optional".
    const closeField = within(screen.getByTestId('template-field-close_field'));
    expect(closeField.getByTestId('form-required-on-close-field-label')).toBeInTheDocument();
    expect(closeField.queryByTestId('form-optional-field-label')).not.toBeInTheDocument();
  });
});
