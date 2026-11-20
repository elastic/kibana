/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
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

  it('still offers add on an empty editable list', () => {
    renderList({ properties: [] });

    expect(screen.getByTestId('schemaProperty-add')).toBeInTheDocument();
  });
});
