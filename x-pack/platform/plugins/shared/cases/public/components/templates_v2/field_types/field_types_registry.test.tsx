/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { load as parseYaml } from 'js-yaml';

import { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import { render, screen } from '@testing-library/react';
import { TemplateFieldRenderer } from './field_renderer';

/**
 * NOTE: this test uses a mock template definition to try and render the controls
 * as per their definitions stored in the controlRegistry
 */
const mockTemplateDefinition = `
name: Template definition
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
name: Invalid definition
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
  const parseResult = ParsedTemplateDefinitionSchema.safeParse(parseYaml(templateDefinition));

  if (!parseResult.success) {
    return <>{`Invalid template definition:\n ${parseResult.error}`}</>;
  }

  return <TemplateFieldRenderer parsedTemplate={parseResult.data} values={values} />;
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
