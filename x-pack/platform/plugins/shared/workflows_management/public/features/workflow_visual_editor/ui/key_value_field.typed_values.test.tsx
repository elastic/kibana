/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { KeyValueField } from './key_value_field';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';

// A value cell is a plain input, so the test types into it and leaves it, as a user does.
jest.mock('./reference_capable_field', () => ({
  ReferenceCapableField: ({
    value,
    onChange,
    children,
  }: {
    value: string;
    onChange: (next: string) => void;
    children: (bind: { value: string; reportChange: (next: string) => void }) => React.ReactNode;
  }) => <>{children({ value, reportChange: onChange })}</>,
}));
jest.mock('./reference_text_input', () => ({
  ReferenceTextInput: ({
    bind,
    onBlur,
  }: {
    bind: { value: string; reportChange: (next: string) => void };
    onBlur: () => void;
  }) => (
    <input
      data-test-subj="cell"
      value={bind.value}
      onChange={(event) => bind.reportChange(event.target.value)}
      onBlur={onBlur}
    />
  ),
}));

const catalog: DataReferenceCatalog = { groups: [] };

const typeInFirstCell = (typedValues: boolean | 'objects' | undefined, text: string) => {
  const onChange = jest.fn();
  const { unmount } = render(
    <I18nProvider>
      <KeyValueField
        value={{ name: '' }}
        onChange={onChange}
        onDraftErrorChange={jest.fn()}
        catalog={catalog}
        fieldLabel="Field"
        addLabel="Add field"
        testSubj="kv"
        typedValues={typedValues}
        renderJsonValue={() => <span />}
      />
    </I18nProvider>
  );
  const cell = screen.getByTestId('cell');
  fireEvent.change(cell, { target: { value: text } });
  fireEvent.blur(cell);
  const [last] = onChange.mock.calls.slice(-1);
  unmount();
  return last[0] as Record<string, unknown>;
};

describe('KeyValueField typed values', () => {
  const nested = '{"id":"{{ item.id }}","summary":"{{ item.summary }}"}';

  it('keeps every row as text when values are not typed', () => {
    expect(typeInFirstCell(undefined, nested)).toEqual({ name: nested });
    expect(typeInFirstCell(false, 'true')).toEqual({ name: 'true' });
  });

  it('reads words and JSON as YAML does when values are fully typed (data.set)', () => {
    expect(typeInFirstCell(true, 'true')).toEqual({ name: true });
    expect(typeInFirstCell(true, '3')).toEqual({ name: 3 });
    expect(typeInFirstCell(true, nested)).toEqual({
      name: { id: '{{ item.id }}', summary: '{{ item.summary }}' },
    });
  });

  it('turns a JSON object into the nested value and leaves everything else as text (data.map)', () => {
    expect(typeInFirstCell('objects', nested)).toEqual({
      name: { id: '{{ item.id }}', summary: '{{ item.summary }}' },
    });
    expect(typeInFirstCell('objects', 'true')).toEqual({ name: 'true' });
    expect(typeInFirstCell('objects', '3')).toEqual({ name: '3' });
    expect(typeInFirstCell('objects', '["a"]')).toEqual({ name: '["a"]' });
    // A whole reference is the existing reference form, not a nested value.
    expect(typeInFirstCell('objects', '{{ item.name }}')).toEqual({ name: '${{ item.name }}' });
  });
});
