/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the "Elastic License
 * 2.0".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { SchemaFormField } from './schema_form_field';
import type { FieldDescriptor } from '../types';

const Wrapper = ({
  children,
  defaultValues = {},
}: {
  children: (control: ReturnType<typeof useForm>['control']) => React.ReactNode;
  defaultValues?: Record<string, unknown>;
}) => {
  const Component = () => {
    const { control } = useForm({ defaultValues: defaultValues as Record<string, {}> });
    return <>{children(control)}</>;
  };
  return <Component />;
};

const renderField = (descriptor: FieldDescriptor, defaultValues?: Record<string, unknown>) => {
  return render(
    <Wrapper defaultValues={defaultValues}>
      {(control) => <SchemaFormField descriptor={descriptor} control={control} />}
    </Wrapper>
  );
};

describe('SchemaFormField', () => {
  it('renders EuiSwitch for toggle type', () => {
    renderField(
      { path: 'showLabels', type: 'toggle', label: 'Show labels', defaultValue: true },
      { showLabels: true }
    );
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.getByText('Show labels')).toBeInTheDocument();
  });

  it('renders EuiSelect for select type', () => {
    renderField(
      {
        path: 'position',
        type: 'select',
        label: 'Position',
        options: [
          { value: 'top', label: 'top' },
          { value: 'bottom', label: 'bottom' },
        ],
        defaultValue: 'top',
      },
      { position: 'top' }
    );
    expect(screen.getByRole('group', { name: 'Position' })).toBeInTheDocument();
  });

  it('renders EuiFieldNumber for number type', () => {
    renderField(
      { path: 'size', type: 'number', label: 'Size', min: 0, max: 100, defaultValue: 10 },
      { size: 10 }
    );
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
  });

  it('renders EuiFieldText for text type', () => {
    renderField({ path: 'title', type: 'text', label: 'Title', defaultValue: '' }, { title: '' });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders EuiAccordion for section type with children', () => {
    renderField(
      {
        path: 'legend',
        type: 'section',
        label: 'Legend',
        children: [
          { path: 'legend.show', type: 'toggle', label: 'Show legend', defaultValue: true },
        ],
      },
      { 'legend.show': true }
    );
    expect(screen.getByText('Legend')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('renders nothing for unknown type', () => {
    const { container } = renderField({
      path: 'mystery',
      type: 'unknown',
      label: 'Mystery',
    });
    expect(container.innerHTML).toBe('');
  });
});
