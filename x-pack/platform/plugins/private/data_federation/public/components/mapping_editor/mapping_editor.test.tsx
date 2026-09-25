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

import { MappingEditor } from './mapping_editor';
import type { MappingEditorValue } from './mapping_editor';

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
    dataFederation: {},
  },
} as unknown as DocLinksStart;

describe('MappingEditor', () => {
  it('does not clear the draft name when a reserved field name is submitted', () => {
    const Wrapper = () => {
      const [value, setValue] = React.useState<MappingEditorValue>({ dynamic: true, fields: [] });

      return (
        <EuiProvider>
          <MappingEditor
            value={value}
            onChange={setValue}
            docLinks={docLinksMock}
            reservedFieldNames={['@timestamp']}
          />
        </EuiProvider>
      );
    };

    const { getByTestId, getByText } = render(<Wrapper />);

    fireEvent.click(getByTestId('dataFederationMappingEditorAddField'));

    fireEvent.change(getByTestId('dataFederationMappingEditorFieldName'), {
      target: { value: '@timestamp' },
    });

    fireEvent.click(getByTestId('dataFederationMappingEditorDraftAddField'));

    expect(getByText('This field name is reserved.')).toBeInTheDocument();

    // Draft field value remains.
    expect((getByTestId('dataFederationMappingEditorFieldName') as HTMLInputElement).value).toBe(
      '@timestamp'
    );
  });
});
