/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

import { CustomFieldTypes } from '../../../../common/types/domain';
import { FieldType } from '../../../../common/types/domain/template/fields';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import type { CasesConfigurationUICustomField } from '../../../../common/ui/types';
import { renderWithTestingProviders } from '../../../common/mock';
import { getExtendedFieldColumnKey } from '../components/extended_field_columns';
import type { FieldColumnRow } from './get_field_columns';
import { getFieldColumns } from './get_field_columns';

interface ColumnWithRender {
  name: string;
  sortable?: unknown;
  render: (item: FieldColumnRow) => React.ReactNode;
}

const userProfiles = new Map<string, UserProfileWithAvatar>();

const textField = {
  name: 'summary',
  type: 'keyword',
  label: 'Summary',
  control: FieldType.INPUT_TEXT,
} as InlineField;

const toggleKey = 'toggle_key';
const customFields: CasesConfigurationUICustomField[] = [
  {
    key: toggleKey,
    label: 'My toggle',
    type: CustomFieldTypes.TOGGLE,
    required: false,
    defaultValue: false,
  },
];

const row: FieldColumnRow = { customFields: [], extendedFields: {} };

describe('getFieldColumns', () => {
  describe('templates v2 off', () => {
    it('builds one column per supported custom field', () => {
      const columns = getFieldColumns<FieldColumnRow>({
        templatesEnabled: false,
        globalInlineFields: [textField],
        customFields,
        userProfiles,
      });

      expect(Object.keys(columns)).toEqual([toggleKey]);
      expect((columns[toggleKey] as ColumnWithRender).name).toBe('My toggle');
      expect((columns[toggleKey] as ColumnWithRender).sortable).toBeUndefined();
    });

    it('skips a custom field with an unsupported type', () => {
      const unsupported = [
        { key: 'bad_key', label: 'Bad', type: 'unsupported', required: false },
      ] as unknown as CasesConfigurationUICustomField[];

      const columns = getFieldColumns<FieldColumnRow>({
        templatesEnabled: false,
        globalInlineFields: [],
        customFields: unsupported,
        userProfiles,
      });

      expect(columns).toEqual({});
    });

    it('renders the custom field value of the row', () => {
      const columns = getFieldColumns<FieldColumnRow>({
        templatesEnabled: false,
        globalInlineFields: [],
        customFields,
        userProfiles,
      });

      renderWithTestingProviders(
        <>
          {(columns[toggleKey] as ColumnWithRender).render({
            ...row,
            customFields: [{ key: toggleKey, type: CustomFieldTypes.TOGGLE, value: true }],
          })}
        </>
      );

      expect(
        screen.getByTestId(`toggle-custom-field-column-view-${toggleKey}-check`)
      ).toBeInTheDocument();
    });

    it('renders an empty cell when the row has no value for the custom field', () => {
      const columns = getFieldColumns<FieldColumnRow>({
        templatesEnabled: false,
        globalInlineFields: [],
        customFields,
        userProfiles,
      });

      renderWithTestingProviders(
        <>
          {(columns[toggleKey] as ColumnWithRender).render({
            ...row,
            customFields: [{ key: toggleKey, type: CustomFieldTypes.TOGGLE, value: null }],
          })}
        </>
      );

      expect(
        screen.queryByTestId(`toggle-custom-field-column-view-${toggleKey}-check`)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(`toggle-custom-field-column-view-${toggleKey}-cross`)
      ).not.toBeInTheDocument();
    });
  });

  describe('templates v2 on', () => {
    it('builds one column per global field and no legacy custom field column', () => {
      const columns = getFieldColumns<FieldColumnRow>({
        templatesEnabled: true,
        globalInlineFields: [textField],
        customFields,
        userProfiles,
      });

      expect(Object.keys(columns)).toEqual([getExtendedFieldColumnKey(textField)]);
    });

    it('renders the extended field value of the row', () => {
      const columns = getFieldColumns<FieldColumnRow>({
        templatesEnabled: true,
        globalInlineFields: [textField],
        customFields: [],
        userProfiles,
      });
      const column = columns[getExtendedFieldColumnKey(textField)] as ColumnWithRender;

      expect(column.name).toBe('Summary');

      renderWithTestingProviders(
        <>{column.render({ ...row, extendedFields: { summaryAsKeyword: 'hello' } })}</>
      );

      expect(screen.getByText('hello')).toBeInTheDocument();
    });
  });
});
