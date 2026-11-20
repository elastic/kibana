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
import type {
  CatalogueComponentDefinition,
  CatalogueNamedFieldDefinition,
} from '@kbn/streams-schema';
import { ComponentDefinitionForm } from './component_definition_form';
import { createInitialObject } from './serialize';
import { definitionOf, testCatalogue } from './test_helpers';
import type { FieldErrors, ObjectValue } from './values';

const telemetry = ['logs' as const];

function Harness({
  onValues,
  errors,
  definition = definitionOf('set'),
  initialValues,
}: {
  onValues: (values: ObjectValue) => void;
  errors?: FieldErrors;
  definition?: CatalogueComponentDefinition;
  initialValues?: ObjectValue;
}) {
  const [values, setValues] = useState<ObjectValue>(
    () =>
      initialValues ??
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
          definition={{ ...definitionOf('set'), fields: [payload] }}
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

  describe('a list of paths', () => {
    // The shape of `delete_fields`: the paths are list items, and the location is one level up.
    const fields: CatalogueNamedFieldDefinition[] = [
      {
        name: 'fields',
        type: 'array',
        required: true,
        min_items: 1,
        items: {
          type: 'object',
          fields: [
            {
              name: 'location',
              type: 'enum',
              required: true,
              default: 'attributes',
              options: [{ value: 'attributes' }, { value: 'resource' }],
            },
            {
              name: 'names',
              type: 'array',
              required: true,
              min_items: 1,
              items: { type: 'path', required: true, path_set: 'keys' },
            },
          ],
        },
      },
    ];
    const metadata = {
      ...testCatalogue.metadata,
      path_sets: {
        keys: {
          contexts: {},
          locations: {
            attributes: [{ path: 'service.name' }],
            resource: [{ path: 'host.name' }],
          },
        },
      },
    };

    const renderPaths = (item: ObjectValue) => {
      const onChange = jest.fn();
      render(
        <EuiProvider>
          <ComponentDefinitionForm
            definition={{ ...definitionOf('delete_fields'), fields }}
            metadata={metadata}
            telemetry={telemetry}
            values={{ fields: [item] }}
            onChange={onChange}
          />
        </EuiProvider>
      );
      const input = screen.getByTestId('componentDefinitionFormPath-item').querySelector('input');
      if (!input) {
        throw new Error('Path combo box rendered without a search input');
      }
      return { onChange, input };
    };

    it('edits each path in a path picker', () => {
      const { onChange, input } = renderPaths({ location: 'attributes', names: [''] });

      fireEvent.change(input, { target: { value: 'env' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(lastCall(onChange)).toEqual({
        fields: [{ location: 'attributes', names: ['env'] }],
      });
    });

    it('suggests the paths of the location chosen in the object around the list', async () => {
      const { input } = renderPaths({ location: 'resource', names: [''] });

      await userEvent.click(input);

      expect(await screen.findByTestId('autocomplete-suggestion-host.name')).toBeTruthy();
      expect(screen.queryByTestId('autocomplete-suggestion-service.name')).toBeNull();
    });
  });

  describe('a list of plain values', () => {
    it('starts a required list with a row to fill in', () => {
      const onValues = jest.fn();
      render(<Harness onValues={onValues} definition={definitionOf('filter')} />);

      fireEvent.change(screen.getByTestId('componentDefinitionFormString-item'), {
        target: { value: 'attributes["env"] == "dev"' },
      });

      expect(lastCall(onValues)).toEqual({
        conditions: [{ conditions: ['attributes["env"] == "dev"'] }],
      });
    });

    it('says what is wrong with a row under it', () => {
      render(
        <Harness
          onValues={jest.fn()}
          definition={definitionOf('filter')}
          errors={{ '/conditions/0/conditions/0': 'This field is required' }}
        />
      );

      expect(screen.getByText('This field is required')).toBeTruthy();
    });
  });

  describe('layout hints', () => {
    const advancedGroup = () => screen.getByTestId('componentDefinitionFormGroup-advanced');
    const isOpen = (group: HTMLElement) =>
      group.querySelector('button[aria-expanded]')?.getAttribute('aria-expanded') === 'true';
    // A list inside a list item has its own "Add item"; the one of the outer list comes last.
    const lastOf = (elements: HTMLElement[]) => elements[elements.length - 1];

    it('puts the fields that share a row on one line', () => {
      render(<Harness onValues={jest.fn()} />);
      const row = within(screen.getByTestId('componentDefinitionFormFieldRow-target'));

      expect(row.getByTestId('componentDefinitionFormChoice-target_path')).toBeTruthy();
      expect(row.getByTestId('componentDefinitionFormPath-path')).toBeTruthy();
      expect(row.getByTestId('componentDefinitionFormRow-action')).toBeTruthy();
      // The value has its row to itself, so it is not wrapped as a shared one.
      expect(row.queryByTestId('componentDefinitionFormChoice-value_source')).toBeNull();
      expect(screen.queryByTestId('componentDefinitionFormFieldRow-value')).toBeNull();
    });

    it('keeps the way to switch a choice next to a field that shares its line', async () => {
      const onValues = jest.fn();
      render(<Harness onValues={onValues} />);

      await userEvent.click(
        screen.getByTestId('componentDefinitionFormChoice-target_path-context')
      );

      expect(
        within(screen.getByTestId('componentDefinitionFormFieldRow-target')).getByTestId(
          'componentDefinitionFormRow-context'
        )
      ).toBeTruthy();
    });

    it('groups the fields of a list item as the definition says', () => {
      render(<Harness onValues={jest.fn()} definition={definitionOf('filter')} />);
      // The first item is the block; the condition inside it is an item of a list of its own.
      const [block] = screen.getAllByTestId('componentDefinitionFormArrayItem');
      const group = within(block).getByTestId('componentDefinitionFormGroup-advanced');

      expect(within(group).getByTestId('componentDefinitionFormRow-error_mode')).toBeTruthy();
      expect(within(group).getByTestId('componentDefinitionFormRow-context')).toBeTruthy();
      expect(within(group).queryByTestId('componentDefinitionFormRow-conditions')).toBeNull();
      expect(isOpen(group)).toBe(false);
    });

    it('has one group for each item of a list', async () => {
      render(<Harness onValues={jest.fn()} definition={definitionOf('transform')} />);

      await userEvent.click(
        lastOf(screen.getAllByTestId('componentDefinitionFormArrayAdd-statements'))
      );

      const groups = screen.getAllByTestId('componentDefinitionFormGroup-advanced');
      expect(groups).toHaveLength(2);
      const controlled = groups.map((group) =>
        group.querySelector('button[aria-controls]')?.getAttribute('aria-controls')
      );
      expect(new Set(controlled).size).toBe(2);
    });

    it('opens an advanced group that holds a field with an error', () => {
      const { rerender } = render(
        <Harness onValues={jest.fn()} definition={definitionOf('filter')} />
      );
      expect(isOpen(advancedGroup())).toBe(false);

      rerender(
        <Harness
          onValues={jest.fn()}
          definition={definitionOf('filter')}
          errors={{ '/conditions/0/error_mode': 'Unknown error mode' }}
        />
      );

      expect(isOpen(advancedGroup())).toBe(true);
    });

    it('lets an advanced group be opened and closed', async () => {
      render(<Harness onValues={jest.fn()} definition={definitionOf('filter')} />);
      const toggle = within(advancedGroup()).getByText('Advanced');

      await userEvent.click(toggle);
      expect(isOpen(advancedGroup())).toBe(true);

      await userEvent.click(toggle);
      expect(isOpen(advancedGroup())).toBe(false);
    });

    it('says what a group is for', () => {
      const definition = definitionOf('filter');
      render(
        <Harness
          onValues={jest.fn()}
          definition={{
            ...definition,
            groups: definition.groups?.map((group) => ({
              ...group,
              description: 'Settings most filters leave alone.',
            })),
          }}
        />
      );

      expect(within(advancedGroup()).getByText('Settings most filters leave alone.')).toBeTruthy();
    });

    it('says what an item of a list is once, above the list', async () => {
      render(<Harness onValues={jest.fn()} definition={definitionOf('filter')} />);

      await userEvent.click(
        lastOf(screen.getAllByTestId('componentDefinitionFormArrayAdd-conditions'))
      );

      expect(screen.getAllByTestId('componentDefinitionFormGroup-advanced')).toHaveLength(2);
      expect(
        screen.getAllByText(
          'A block of conditions. Data is dropped when it matches any condition of any block.'
        )
      ).toHaveLength(1);
    });
  });

  describe('a map', () => {
    const labels: CatalogueNamedFieldDefinition = {
      name: 'labels',
      type: 'map',
      key_pattern: '^[a-z_]+$',
      value_schema: { type: 'string' },
      max_entries: 2,
    };
    const definition = { ...definitionOf('set'), fields: [labels] };
    const addEntry = () =>
      fireEvent.click(screen.getByTestId('componentDefinitionFormMapAdd-labels'));

    it('writes a new entry before it is filled in, so it can be asked for', () => {
      const onValues = jest.fn();
      render(<Harness onValues={onValues} definition={definition} />);

      addEntry();
      expect(lastCall(onValues)).toEqual({ labels: { '': '' } });

      fireEvent.change(screen.getByTestId('componentDefinitionFormMapKey'), {
        target: { value: 'team' },
      });
      fireEvent.change(screen.getByTestId('componentDefinitionFormString-item'), {
        target: { value: 'core' },
      });
      expect(lastCall(onValues)).toEqual({ labels: { team: 'core' } });
    });

    it('says what is wrong with an entry under it and marks the key when it is the key', () => {
      render(
        <Harness
          onValues={jest.fn()}
          definition={definition}
          errors={{ '/labels/': 'Enter a key' }}
        />
      );

      addEntry();

      const entry = within(screen.getByTestId('componentDefinitionFormMapEntry'));
      expect(entry.getByText('Enter a key')).toBeTruthy();
      expect(entry.getByTestId('componentDefinitionFormMapKey').getAttribute('aria-invalid')).toBe(
        'true'
      );
    });

    it('does not mark the key when it is the value that is wrong', () => {
      render(
        <Harness
          onValues={jest.fn()}
          definition={definition}
          errors={{ '/labels/team': 'This field is required' }}
        />
      );

      addEntry();
      fireEvent.change(screen.getByTestId('componentDefinitionFormMapKey'), {
        target: { value: 'team' },
      });

      const entry = within(screen.getByTestId('componentDefinitionFormMapEntry'));
      expect(entry.getByText('This field is required')).toBeTruthy();
      expect(
        entry.getByTestId('componentDefinitionFormMapKey').getAttribute('aria-invalid')
      ).not.toBe('true');
    });

    it('keeps a null value when another part of the entry changes', () => {
      const onValues = jest.fn();
      render(
        <Harness
          onValues={onValues}
          definition={{
            ...definition,
            fields: [{ ...labels, value_schema: { type: 'literal' } }],
          }}
          initialValues={{ labels: { team: null } }}
        />
      );

      fireEvent.change(screen.getByTestId('componentDefinitionFormMapKey'), {
        target: { value: 'owner' },
      });

      expect(lastCall(onValues)).toEqual({ labels: { owner: null } });
    });

    it('stops at the max_entries of the catalogue', () => {
      render(<Harness onValues={jest.fn()} definition={definition} />);

      addEntry();
      addEntry();

      expect(screen.getAllByTestId('componentDefinitionFormMapEntry')).toHaveLength(2);
      expect(
        screen.getByTestId('componentDefinitionFormMapAdd-labels').hasAttribute('disabled')
      ).toBe(true);
    });
  });

  it('says what is wrong with a list item as a whole', () => {
    render(<Harness onValues={jest.fn()} errors={{ '/operations/0': 'Unknown operation' }} />);

    expect(
      within(screen.getByTestId('componentDefinitionFormArrayItem')).getByText('Unknown operation')
    ).toBeTruthy();
  });

  it('renders one set operation with the choice groups and preselected values', () => {
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
      operations: [{ location: 'record', action: 'upsert', value: 'core' }],
    });
  });

  it('switches the value source to an OTTL expression', async () => {
    const onValues = jest.fn();
    render(<Harness onValues={onValues} />);
    await userEvent.click(
      screen.getByTestId('componentDefinitionFormChoice-value_source-ottl_value')
    );
    expect(lastCall(onValues)).toEqual({
      operations: [{ location: 'record', action: 'upsert', ottl_value: '' }],
    });
    fireEvent.change(screen.getByTestId('componentDefinitionFormString-ottl_value'), {
      target: { value: 'ToUpperCase(log.body)' },
    });
    expect(lastCall(onValues)).toEqual({
      operations: [{ location: 'record', action: 'upsert', ottl_value: 'ToUpperCase(log.body)' }],
    });
  });

  it('adds and removes array items', async () => {
    const onValues = jest.fn();
    render(<Harness onValues={onValues} />);
    await userEvent.click(screen.getByTestId('componentDefinitionFormArrayAdd-operations'));
    expect(screen.getAllByTestId('componentDefinitionFormArrayItem')).toHaveLength(2);
    const [, second] = screen.getAllByTestId('componentDefinitionFormArrayRemove');
    await userEvent.click(second);
    expect(screen.getAllByTestId('componentDefinitionFormArrayItem')).toHaveLength(1);
  });

  it('keeps the last required item', () => {
    render(<Harness onValues={jest.fn()} />);
    expect(screen.queryByTestId('componentDefinitionFormArrayRemove')).toBeNull();
  });

  it('does not cap a list the catalogue sets no max_items for', () => {
    render(<Harness onValues={jest.fn()} />);
    const add = screen.getByTestId('componentDefinitionFormArrayAdd-operations');

    for (let added = 1; added < 7; added++) {
      fireEvent.click(add);
    }

    expect(screen.getAllByTestId('componentDefinitionFormArrayItem')).toHaveLength(7);
    expect(add.hasAttribute('disabled')).toBe(false);
    expect(screen.queryByTestId('componentDefinitionFormArrayLimit-operations')).toBeNull();
  });

  it('stops a list at the max_items of the catalogue', () => {
    const definition = definitionOf('set');
    render(
      <Harness
        onValues={jest.fn()}
        definition={{
          ...definition,
          fields: definition.fields.map((field) =>
            field.name === 'operations' ? { ...field, max_items: 2 } : field
          ),
        }}
      />
    );
    const add = screen.getByTestId('componentDefinitionFormArrayAdd-operations');
    expect(screen.queryByTestId('componentDefinitionFormArrayLimit-operations')).toBeNull();

    fireEvent.click(add);

    expect(screen.getAllByTestId('componentDefinitionFormArrayItem')).toHaveLength(2);
    expect(add.hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('componentDefinitionFormArrayLimit-operations').textContent).toBe(
      'You can add up to 2 items.'
    );
  });

  it('only offers dragging once there is more than one item', async () => {
    render(<Harness onValues={jest.fn()} />);
    expect(screen.queryByTestId('stepDragHandle')).toBeNull();
    await userEvent.click(screen.getByTestId('componentDefinitionFormArrayAdd-operations'));
    expect(screen.getAllByTestId('stepDragHandle')).toHaveLength(2);
  });

  it('shows errors at their pointers', () => {
    render(
      <Harness onValues={jest.fn()} errors={{ '/operations/0/path': 'This field is required' }} />
    );
    expect(screen.getByText('This field is required')).toBeTruthy();
  });
});
