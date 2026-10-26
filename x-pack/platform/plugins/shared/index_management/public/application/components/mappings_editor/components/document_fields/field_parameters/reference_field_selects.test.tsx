/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { Form, useForm, useFormData } from '../../../shared_imports';
import { ReferenceFieldSelects } from './reference_field_selects';

jest.mock('../../../mappings_state_context', () => ({
  useMappingsState: jest.fn(),
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');

  return {
    ...actual,
    EuiSuperSelect: ({
      options,
      valueOfSelected,
      onChange,
      'data-test-subj': dataTestSubj,
    }: {
      options: Array<{ value: string; inputDisplay: string; 'data-test-subj'?: string }>;
      valueOfSelected: string;
      onChange: (value: string) => void;
      'data-test-subj'?: string;
    }) => (
      <select
        data-test-subj={dataTestSubj ?? 'mockEuiSuperSelect'}
        defaultValue={valueOfSelected}
        onBlur={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} data-test-subj={opt['data-test-subj']}>
            {opt.inputDisplay}
          </option>
        ))}
      </select>
    ),
  };
});

const FormWrapper = ({
  children,
  defaultValue = {},
}: {
  children: React.ReactNode;
  defaultValue?: Record<string, unknown>;
}) => {
  const { form } = useForm({ defaultValue });
  return (
    <I18nProvider>
      <Form form={form}>{children}</Form>
    </I18nProvider>
  );
};

const mockUseMappingsState = jest.requireMock('../../../mappings_state_context')
  .useMappingsState as jest.Mock;

const ReferenceFieldValueSpy = () => {
  const [{ reference_field: referenceField }] = useFormData<{ reference_field?: string }>({
    watch: 'reference_field',
  });
  return <div data-test-subj="referenceFieldSpy">{referenceField ?? ''}</div>;
};

describe('ReferenceFieldSelects', () => {
  describe('WHEN rendered with mixed field types in mappings state', () => {
    it('SHOULD list only non-multi text fields', async () => {
      mockUseMappingsState.mockReturnValue({
        mappingViewFields: {
          byId: {
            title: { source: { type: 'text' }, isMultiField: false, path: ['title'] },
            keyword: { source: { type: 'keyword' }, isMultiField: false, path: ['keyword'] },
          },
        },
        fields: {
          byId: {
            nestedText: { source: { type: 'text' }, isMultiField: false, path: ['a', 'b'] },
            multiText: { source: { type: 'text' }, isMultiField: true, path: ['multi'] },
          },
        },
      });

      render(
        <FormWrapper defaultValue={{ reference_field: '' }}>
          <ReferenceFieldSelects />
          <ReferenceFieldValueSpy />
        </FormWrapper>
      );

      const select = await screen.findByTestId('select');
      const optionValues = Array.from((select as HTMLSelectElement).options).map((o) => o.value);

      expect(optionValues).toContain('title');
      expect(optionValues).toContain('a.b');
      expect(optionValues).not.toContain('keyword');
      expect(optionValues).not.toContain('multi');
    });
  });

  describe('WHEN an option is selected', () => {
    it('SHOULD update the reference_field form value', async () => {
      mockUseMappingsState.mockReturnValue({
        mappingViewFields: {
          byId: {
            title: { source: { type: 'text' }, isMultiField: false, path: ['title'] },
          },
        },
        fields: { byId: {} },
      });

      render(
        <FormWrapper defaultValue={{ reference_field: '' }}>
          <ReferenceFieldSelects />
          <ReferenceFieldValueSpy />
        </FormWrapper>
      );

      const select = (await screen.findByTestId('select')) as HTMLSelectElement;
      await act(async () => {
        fireEvent.change(select, { target: { value: 'title' } });
        fireEvent.blur(select);
      });

      expect(await screen.findByTestId('referenceFieldSpy')).toHaveTextContent('title');
    });
  });
});
