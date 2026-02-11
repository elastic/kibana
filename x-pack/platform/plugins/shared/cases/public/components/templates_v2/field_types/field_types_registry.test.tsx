/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { load as parseYaml } from 'js-yaml';

import { ParsedTemplateSchema } from '../../../../common/types/domain';
import { controlRegistry } from './field_types_registry';
import { render, screen } from '@testing-library/react';
import { FormProvider } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib/form_context';
import { useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib/hooks/use_form';

/**
 * NOTE: this test uses a mock template definition to try and render the controls
 * as per their definitions stored in the controlRegistry
 */
const mockTemplateDefinition = `
fields:
  - name: severity
    control: SELECT_BASIC
    label: Select label
    type: keyword
    metadata:
      options:
        - low
        - moderate
        - high
        - critical
  - name: name
    control: INPUT_TEXT
    label: Input text label
    type: keyword
  - name: effort
    control: INPUT_NUMBER
    label: Input number label
    type: integer
  - name: details
    control: TEXTAREA
    label: Textarea label
    type: keyword
`;

const invalidTemplateDefinition = `
fields:
  - name: unsupported
    control: UNKNOWN
    label: Unsupported
    type: keyword
`;

const TestTemplatedFormRenderer = ({
  templateDefinition,
  values,
}: {
  templateDefinition: string;
  values: Record<string, unknown>;
}) => {
  const parseResult = ParsedTemplateSchema.safeParse({
    templateId: 'mock_template',
    name: 'Mock template',
    owner: 'security',
    templateVersion: 1,
    deletedAt: null,
    isLatest: true,
    latestVersion: 1,
    definition: parseYaml(templateDefinition),
  });

  const { form } = useForm<{}>({
    defaultValue: {},
    options: { stripEmptyFields: false },
  });

  if (!parseResult.success) {
    return <>{`Invalid template definition:\n ${parseResult.error}`}</>;
  }

  const {
    data: {
      definition: { fields },
    },
  } = parseResult;

  return (
    <FormProvider form={form}>
      {fields.map((field) => {
        const Control = controlRegistry[field.control] as FC<Record<string, unknown>>;
        const controlProps = { ...field, value: values[field.name] };

        return <Control key={field.name} {...controlProps} />;
      })}
    </FormProvider>
  );
};

describe('controlRegistry', () => {
  it('should render all the controls specified in the template', () => {
    render(
      <TestTemplatedFormRenderer
        templateDefinition={mockTemplateDefinition}
        values={{ severity: 'low' }}
      />
    );
    expect(screen.getByTestId('select')).toBeInTheDocument();
    expect(screen.getAllByTestId('input')).toHaveLength(3);
    expect(screen.getByText('Select label')).toBeInTheDocument();
    expect(screen.getByText('Input text label')).toBeInTheDocument();
    expect(screen.getByText('Input number label')).toBeInTheDocument();
    expect(screen.getByText('Textarea label')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'low' })).toBeInTheDocument();
  });

  it('renders an error for unknown controls', () => {
    render(
      <TestTemplatedFormRenderer templateDefinition={invalidTemplateDefinition} values={{}} />
    );

    expect(screen.getByText(/Invalid template definition/)).toBeInTheDocument();
  });

  it('renders controls in template order', () => {
    render(
      <TestTemplatedFormRenderer
        templateDefinition={mockTemplateDefinition}
        values={{ severity: 'low' }}
      />
    );

    const labels = screen.getAllByText(/label$/i).map((node) => node.textContent);
    expect(labels).toEqual([
      'Select label',
      'Input text label',
      'Input number label',
      'Textarea label',
    ]);
  });
});
