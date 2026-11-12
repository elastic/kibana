/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import type { CatalogueNamedFieldDefinition } from '@kbn/streams-schema';
import { ComponentDefinitionForm } from './component_definition_form';
import { createInitialObject } from './serialize';
import { addFieldsDefinition, testCatalogue } from './test_helpers';
import type { FieldErrors, ObjectValue } from './values';

const telemetry = ['logs' as const];

function Harness({
  onValues,
  errors,
}: {
  onValues: (values: ObjectValue) => void;
  errors?: FieldErrors;
}) {
  const definition = addFieldsDefinition();
  const [values, setValues] = useState<ObjectValue>(() =>
    createInitialObject(definition.fields, undefined, {
      metadata: testCatalogue.metadata,
      telemetry,
    })
  );
  return (
    <EuiProvider>
      <ComponentDefinitionForm
        definition={definition}
        metadata={testCatalogue.metadata}
        telemetry={telemetry}
        values={values}
        errors={errors}
        onChange={(next) => {
          setValues(next);
          onValues(next);
        }}
      />
    </EuiProvider>
  );
}

const lastCall = (mock: jest.Mock): ObjectValue => mock.mock.calls[mock.mock.calls.length - 1][0];

describe('ComponentDefinitionForm', () => {
  it('reports JSON it cannot parse so its owner can hold the last parsed value back', () => {
    const payload: CatalogueNamedFieldDefinition = {
      name: 'payload',
      type: 'literal',
      literal_kinds: ['object'],
    };
    const onUnparsedInputChange = jest.fn();
    render(
      <EuiProvider>
        <ComponentDefinitionForm
          definition={{ ...addFieldsDefinition(), fields: [payload] }}
          metadata={testCatalogue.metadata}
          telemetry={telemetry}
          values={{}}
          onChange={jest.fn()}
          onUnparsedInputChange={onUnparsedInputChange}
        />
      </EuiProvider>
    );
    const input = screen.getByTestId('componentDefinitionFormLiteral-payload');

    fireEvent.change(input, { target: { value: '{"team":' } });
    expect(onUnparsedInputChange).toHaveBeenLastCalledWith(true);

    fireEvent.change(input, { target: { value: '{"team":"core"}' } });
    expect(onUnparsedInputChange).toHaveBeenLastCalledWith(false);
  });

  it('renders one add_fields row with the choice groups and preselected values', () => {
    render(<Harness onValues={jest.fn()} />);
    const items = screen.getAllByTestId('componentDefinitionFormArrayItem');
    expect(items).toHaveLength(1);
    expect(within(items[0]).getByTestId('componentDefinitionFormChoice-target_path')).toBeTruthy();
    expect(within(items[0]).getByTestId('componentDefinitionFormChoice-value_source')).toBeTruthy();
    expect(within(items[0]).getByTestId('componentDefinitionFormRow-location')).toBeTruthy();
    expect(within(items[0]).queryByTestId('componentDefinitionFormRow-context')).toBeNull();
  });

  it('writes literal values typed into the value field', () => {
    const onValues = jest.fn();
    render(<Harness onValues={onValues} />);
    fireEvent.change(screen.getByTestId('componentDefinitionFormLiteral-value'), {
      target: { value: 'core' },
    });
    expect(lastCall(onValues)).toEqual({
      fields: [{ location: 'record', action: 'upsert', value: 'core' }],
    });
  });

  it('switches the value source to an OTTL expression', async () => {
    const onValues = jest.fn();
    render(<Harness onValues={onValues} />);
    await userEvent.click(
      screen.getByTestId('componentDefinitionFormChoice-value_source-ottl_value')
    );
    expect(lastCall(onValues)).toEqual({
      fields: [{ location: 'record', action: 'upsert', ottl_value: '' }],
    });
    fireEvent.change(screen.getByTestId('componentDefinitionFormString-ottl_value'), {
      target: { value: 'ToUpperCase(log.body)' },
    });
    expect(lastCall(onValues)).toEqual({
      fields: [{ location: 'record', action: 'upsert', ottl_value: 'ToUpperCase(log.body)' }],
    });
  });

  it('adds and removes array items', async () => {
    const onValues = jest.fn();
    render(<Harness onValues={onValues} />);
    await userEvent.click(screen.getByTestId('componentDefinitionFormArrayAdd-fields'));
    expect(screen.getAllByTestId('componentDefinitionFormArrayItem')).toHaveLength(2);
    const [, second] = screen.getAllByTestId('componentDefinitionFormArrayRemove');
    await userEvent.click(second);
    expect(screen.getAllByTestId('componentDefinitionFormArrayItem')).toHaveLength(1);
  });

  it('keeps the last required item', () => {
    render(<Harness onValues={jest.fn()} />);
    expect(screen.queryByTestId('componentDefinitionFormArrayRemove')).toBeNull();
  });

  it('caps an array without a catalogue max_items at five items', async () => {
    render(<Harness onValues={jest.fn()} />);
    const add = screen.getByTestId('componentDefinitionFormArrayAdd-fields');
    expect(screen.queryByTestId('componentDefinitionFormArrayLimit-fields')).toBeNull();

    for (let added = 1; added < 5; added++) {
      await userEvent.click(add);
    }

    expect(screen.getAllByTestId('componentDefinitionFormArrayItem')).toHaveLength(5);
    expect(add.hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('componentDefinitionFormArrayLimit-fields').textContent).toBe(
      'You can add up to 5 items.'
    );
  });

  it('only offers dragging once there is more than one item', async () => {
    render(<Harness onValues={jest.fn()} />);
    expect(screen.queryByTestId('stepDragHandle')).toBeNull();
    await userEvent.click(screen.getByTestId('componentDefinitionFormArrayAdd-fields'));
    expect(screen.getAllByTestId('stepDragHandle')).toHaveLength(2);
  });

  it('shows errors at their pointers', () => {
    render(
      <Harness onValues={jest.fn()} errors={{ '/fields/0/path': 'This field is required' }} />
    );
    expect(screen.getByText('This field is required')).toBeTruthy();
  });
});
