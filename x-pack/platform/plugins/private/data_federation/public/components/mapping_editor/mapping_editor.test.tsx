/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, within } from '@testing-library/react';
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

  it('does not apply edits until Update is clicked', () => {
    const Wrapper = () => {
      const [value, setValue] = useState<MappingEditorValue>({
        dynamic: true,
        fields: [
          {
            id: 'field-1',
            name: 'foo',
            path: '',
            type: 'keyword',
            format: '',
          },
        ],
      });

      return (
        <EuiProvider>
          <MappingEditor
            value={value}
            onChange={(next) =>
              setValue((prev) =>
                typeof next === 'function'
                  ? (next as (p: MappingEditorValue) => MappingEditorValue)(prev)
                  : next
              )
            }
            docLinks={docLinksMock}
          />
          <div data-test-subj="mappingEditorValueJson">{JSON.stringify(value)}</div>
        </EuiProvider>
      );
    };

    const { getByTestId } = render(<Wrapper />);

    // Enter edit mode for the first field.
    fireEvent.click(getByTestId('dataFederationMappingEditorEditField'));

    // Change name while editing.
    fireEvent.change(getByTestId('dataFederationMappingEditorFieldName'), {
      target: { value: 'bar' },
    });

    // Underlying mapping value should not change until Update.
    expect(getByTestId('mappingEditorValueJson').textContent).toContain('"name":"foo"');

    fireEvent.click(getByTestId('dataFederationMappingEditorUpdateField'));

    expect(getByTestId('mappingEditorValueJson').textContent).toContain('"name":"bar"');
  });

  it('prompts to confirm before removing a field', () => {
    const Wrapper = () => {
      const [value, setValue] = React.useState<MappingEditorValue>({ dynamic: true, fields: [] });

      return (
        <EuiProvider>
          <MappingEditor value={value} onChange={setValue} docLinks={docLinksMock} />
        </EuiProvider>
      );
    };

    const { getAllByTestId, getByTestId, getByText, queryByText } = render(<Wrapper />);

    fireEvent.click(getByTestId('dataFederationMappingEditorAddField'));
    fireEvent.change(getByTestId('dataFederationMappingEditorFieldName'), {
      target: { value: 'foo' },
    });
    fireEvent.click(getByTestId('dataFederationMappingEditorDraftAddField'));

    expect(getByText('foo')).toBeInTheDocument();

    fireEvent.click(getAllByTestId('dataFederationMappingEditorRemoveField')[0]);
    const modal = getByTestId('dataFederationMappingEditorConfirmRemoveFieldModal');
    expect(modal).toBeInTheDocument();

    fireEvent.click(within(modal).getByText('Cancel'));
    expect(getByText('foo')).toBeInTheDocument();

    fireEvent.click(getAllByTestId('dataFederationMappingEditorRemoveField')[0]);
    const modal2 = getByTestId('dataFederationMappingEditorConfirmRemoveFieldModal');
    fireEvent.click(within(modal2).getByText('Remove field'));

    expect(queryByText('foo')).toBeNull();
  });
});
