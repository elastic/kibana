/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render } from '@testing-library/react';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { FieldTypeSelect } from './field_type_select';

const docLinksMock = {
  links: {
    elasticsearch: {
      mappingKeyword: 'https://docs.example/keyword',
      mappingBoolean: 'https://docs.example/boolean',
      mappingIp: 'https://docs.example/ip',
      mappingDate: 'https://docs.example/date',
      mappingUnsignedLong: 'https://docs.example/unsigned_long',
      mappingNumber: 'https://docs.example/number',
    },
  },
} as unknown as DocLinksStart;

describe('FieldTypeSelect', () => {
  const renderComponent = (props: React.ComponentProps<typeof FieldTypeSelect>) =>
    render(
      <EuiProvider>
        <KibanaContextProvider services={{ docLinks: docLinksMock }}>
          <FieldTypeSelect {...props} />
        </KibanaContextProvider>
      </EuiProvider>
    );

  it('renders the selected type and every supported option', () => {
    const { getByTestId } = renderComponent({ value: 'keyword', onChange: jest.fn() });

    const select = getByTestId('dataFederationMappingEditorFieldType') as HTMLSelectElement;
    expect(select.value).toBe('keyword');
    expect(Array.from(select.options).map(({ value }) => value)).toEqual([
      'boolean',
      'date',
      'date_nanos',
      'double',
      'integer',
      'ip',
      'keyword',
      'long',
      'unsigned_long',
    ]);
  });

  it('links to the documentation for the selected type', () => {
    const { getByRole } = renderComponent({ value: 'integer', onChange: jest.fn() });

    expect(getByRole('link', { name: /Integer field documentation/ })).toHaveAttribute(
      'href',
      'https://docs.example/number'
    );
  });

  it('omits the documentation link when no type is selected', () => {
    const { queryByRole } = renderComponent({ value: '', onChange: jest.fn() });

    expect(queryByRole('link')).toBeNull();
  });

  it('calls onChange with the chosen type', () => {
    const onChange = jest.fn();
    const { getByTestId } = renderComponent({ value: 'keyword', onChange });

    fireEvent.change(getByTestId('dataFederationMappingEditorFieldType'), {
      target: { value: 'date_nanos' },
    });

    expect(onChange).toHaveBeenCalledWith('date_nanos');
  });
});
