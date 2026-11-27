/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SchemaPropertyList } from './schema_property_list';
import { createEmptySchemaProperty } from './schema_property_model';
import { TestProvider } from '../../mocks/test_providers';

const nested = createEmptySchemaProperty({ id: 'child', name: 'city' });
const address = createEmptySchemaProperty({
  id: 'address',
  name: 'address',
  type: 'object',
  properties: [nested],
});

const renderList = (props: Partial<React.ComponentProps<typeof SchemaPropertyList>> = {}) =>
  render(
    <TestProvider>
      <SchemaPropertyList properties={[address]} onChange={jest.fn()} {...props} />
    </TestProvider>
  );

describe('SchemaPropertyList', () => {
  describe('when editable', () => {
    it('offers add and remove controls and enabled inputs', () => {
      renderList();

      expect(screen.getByTestId('schemaProperty-add')).toBeEnabled();
      expect(screen.getByTestId('schemaProperty-remove-address')).toBeEnabled();
      expect(screen.getByTestId('schemaProperty-name-address')).toBeEnabled();
      expect(screen.getByTestId('schemaProperty-type-address')).toBeEnabled();
    });
  });

  describe('when read-only', () => {
    it('shows the properties but no way to add or remove one', () => {
      renderList({ readOnly: true });

      expect(screen.getByTestId('schemaProperty-name-address')).toHaveValue('address');
      expect(screen.queryByTestId('schemaProperty-add')).not.toBeInTheDocument();
      expect(screen.queryByTestId('schemaProperty-remove-address')).not.toBeInTheDocument();
    });

    it('disables every input, including those of a nested object', () => {
      renderList({ readOnly: true });

      expect(screen.getByTestId('schemaProperty-name-address')).toBeDisabled();
      expect(screen.getByTestId('schemaProperty-type-address')).toBeDisabled();
      expect(screen.getByTestId('schemaProperty-description-address')).toBeDisabled();
      expect(screen.getByTestId('schemaProperty-props-name-child')).toBeDisabled();
    });

    it('hides the nested list controls too', () => {
      renderList({ readOnly: true });

      expect(screen.queryByTestId('schemaProperty-props-add')).not.toBeInTheDocument();
      expect(screen.queryByTestId('schemaProperty-props-remove-child')).not.toBeInTheDocument();
    });

    it('offers no add control on an empty list', () => {
      renderList({ readOnly: true, properties: [] });

      expect(screen.getByTestId('schemaProperty-empty')).toBeInTheDocument();
      expect(screen.queryByTestId('schemaProperty-add')).not.toBeInTheDocument();
    });
  });

  it('drops the union of item types a legacy array input had once an item type is chosen', async () => {
    const onChange = jest.fn();
    const ids = createEmptySchemaProperty({
      id: 'ids',
      name: 'ids',
      type: 'array',
      itemType: 'string',
      itemSchema: { anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
    });
    renderList({ properties: [ids], onChange });

    await userEvent.selectOptions(screen.getByTestId('schemaProperty-itemType-ids'), 'number');

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'ids', itemType: 'number', itemSchema: undefined }),
    ]);
  });

  describe('required and default', () => {
    const host = createEmptySchemaProperty({ id: 'host', name: 'host' });

    it('toggles required without touching the default', async () => {
      const onChange = jest.fn();
      renderList({
        properties: [{ ...host, hasDefault: true, defaultValue: 'a' }],
        onChange,
      });

      await userEvent.click(screen.getByTestId('schemaProperty-required-host'));

      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({ required: true, hasDefault: true, defaultValue: 'a' }),
      ]);
    });

    it('explains Required in an info icon, and a click on it does not toggle the checkbox', async () => {
      const onChange = jest.fn();
      renderList({ properties: [host], onChange });

      expect(screen.queryByText(/the caller must provide/i)).not.toBeInTheDocument();
      await userEvent.click(screen.getByTestId('schemaProperty-requiredInfo-host'));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('keeps the default text disabled until the default is enabled, and enabling keeps it empty', async () => {
      const onChange = jest.fn();
      renderList({ properties: [host], onChange });

      expect(screen.getByTestId('schemaProperty-default-host')).toBeDisabled();
      await userEvent.click(screen.getByTestId('schemaProperty-hasDefault-host'));

      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({ hasDefault: true, defaultValue: '' }),
      ]);
    });

    it('takes a default over several lines, such as an ES|QL query', async () => {
      const onChange = jest.fn();
      const query = 'FROM a\n| WHERE b\n| LIMIT 1';
      renderList({ properties: [{ ...host, hasDefault: true, defaultValue: query }], onChange });

      const textbox = screen.getByTestId('schemaProperty-default-host');

      expect(textbox.tagName).toBe('TEXTAREA');
      expect(textbox).toHaveValue(query);
      expect(textbox).toHaveAttribute('rows', '3');
    });

    it('edits the default text once enabled', async () => {
      const onChange = jest.fn();
      renderList({ properties: [{ ...host, hasDefault: true }], onChange });

      await userEvent.type(screen.getByTestId('schemaProperty-default-host'), 'x');

      expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ defaultValue: 'x' })]);
    });
  });

  it('still offers add on an empty editable list', () => {
    renderList({ properties: [] });

    expect(screen.getByTestId('schemaProperty-add')).toBeInTheDocument();
  });
});
