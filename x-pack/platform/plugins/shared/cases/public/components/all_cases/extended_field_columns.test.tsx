/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { renderWithTestingProviders } from '../../common/mock';
import type { CaseUI } from '../../../common/ui/types';
import type { InlineField } from '../../../common/types/domain/template/fields';
import { FieldType } from '../../../common/types/domain/template/fields';
import {
  getExtendedFieldCellValue,
  getExtendedFieldColumnKey,
  getExtendedFieldTableColumn,
  getUserPickerUidsFromCase,
  renderExtendedFieldValue,
} from './extended_field_columns';

const field = (control: FieldType, type = 'keyword'): InlineField =>
  ({ name: 'my_field', type, control } as InlineField);

describe('extended_field_columns helpers', () => {
  describe('getExtendedFieldColumnKey', () => {
    it('builds the `<name>_as_<type>` storage key', () => {
      expect(getExtendedFieldColumnKey(field(FieldType.INPUT_TEXT))).toBe('my_field_as_keyword');
      expect(getExtendedFieldColumnKey(field(FieldType.TOGGLE, 'boolean'))).toBe(
        'my_field_as_boolean'
      );
    });
  });

  describe('renderExtendedFieldValue', () => {
    it('renders an empty cell for missing values', () => {
      const { container } = renderWithTestingProviders(
        <>{renderExtendedFieldValue(field(FieldType.INPUT_TEXT), '')}</>
      );
      expect(container).toHaveTextContent('—');
    });

    it('maps a toggle value to On/Off', () => {
      renderWithTestingProviders(
        <>{renderExtendedFieldValue(field(FieldType.TOGGLE, 'boolean'), 'true')}</>
      );
      expect(screen.getByText('On')).toBeInTheDocument();

      renderWithTestingProviders(
        <>{renderExtendedFieldValue(field(FieldType.TOGGLE, 'boolean'), 'false')}</>
      );
      expect(screen.getByText('Off')).toBeInTheDocument();
    });

    it('joins a checkbox group JSON array', () => {
      renderWithTestingProviders(
        <>{renderExtendedFieldValue(field(FieldType.CHECKBOX_GROUP), '["a","b"]')}</>
      );
      expect(screen.getByText('a, b')).toBeInTheDocument();
    });

    it('extracts user picker names', () => {
      renderWithTestingProviders(
        <>
          {renderExtendedFieldValue(
            field(FieldType.USER_PICKER),
            '[{"name":"jdoe"},{"name":"asmith"}]'
          )}
        </>
      );
      expect(screen.getByText('jdoe, asmith')).toBeInTheDocument();
    });

    it('extracts a user picker name containing an escaped quote', () => {
      // JSON.stringify escapes an embedded `"` in a display name (e.g. a nickname like
      // `Robert "Bob" Smith`); a naive regex over the raw string would mis-split on it.
      renderWithTestingProviders(
        <>
          {renderExtendedFieldValue(
            field(FieldType.USER_PICKER),
            JSON.stringify([{ uid: 'u-1', name: 'Robert "Bob" Smith' }])
          )}
        </>
      );
      expect(screen.getByText('Robert "Bob" Smith')).toBeInTheDocument();
    });

    it('falls back to the raw value for malformed user picker JSON', () => {
      renderWithTestingProviders(
        <>{renderExtendedFieldValue(field(FieldType.USER_PICKER), 'not-json')}</>
      );
      expect(screen.getByText('not-json')).toBeInTheDocument();
    });

    it('renders a plain text value as-is', () => {
      renderWithTestingProviders(
        <>{renderExtendedFieldValue(field(FieldType.INPUT_TEXT), 'hello')}</>
      );
      expect(screen.getByText('hello')).toBeInTheDocument();
    });
  });

  describe('getExtendedFieldCellValue', () => {
    // convertToCamelCase recurses into extended_fields, so client keys are camelCased.
    const priorityField = {
      name: 'priority',
      type: 'keyword',
      control: FieldType.INPUT_TEXT,
    } as InlineField;
    const theCase = { extendedFields: { priorityAsKeyword: 'high' } } as unknown as CaseUI;

    it('reads the value using the camelCased key', () => {
      renderWithTestingProviders(<>{getExtendedFieldCellValue(priorityField, theCase)}</>);
      expect(screen.getByText('high')).toBeInTheDocument();
    });

    it('renders an empty cell when the field has no stored value', () => {
      const { container } = renderWithTestingProviders(
        <>
          {getExtendedFieldCellValue(field(FieldType.INPUT_TEXT), { extendedFields: {} } as CaseUI)}
        </>
      );
      expect(container).toHaveTextContent('—');
    });
  });

  describe('getExtendedFieldTableColumn', () => {
    const userPickerField = {
      name: 'reviewers',
      type: 'keyword',
      control: FieldType.USER_PICKER,
      label: 'Reviewers',
    } as InlineField;

    const damagedRaccoon = {
      uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
      enabled: true,
      data: {},
      user: {
        username: 'damaged_raccoon',
        email: 'damaged_raccoon@elastic.co',
        full_name: 'Damaged Raccoon',
      },
    } as UserProfileWithAvatar;
    const userProfiles = new Map([[damagedRaccoon.uid, damagedRaccoon]]);

    it('renders avatars for a user-picker field using the resolved profile', () => {
      const theCase = {
        extendedFields: {
          reviewersAsKeyword: JSON.stringify([{ uid: damagedRaccoon.uid, name: 'stale name' }]),
        },
      } as unknown as CaseUI;

      const column = getExtendedFieldTableColumn(
        userPickerField,
        userProfiles
      ) as EuiTableFieldDataColumnType<CaseUI>;
      renderWithTestingProviders(<>{column.render?.(theCase, theCase)}</>);

      expect(
        screen.getByTestId('case-table-column-extendedField-reviewers_as_keyword')
      ).toBeInTheDocument();
      // Avatar rendering always prefers the live profile over the stored name snapshot.
      expect(screen.getByText('DR')).toBeInTheDocument();
    });

    it('renders an empty avatar row for a user-picker field with no stored value', () => {
      const theCase = { extendedFields: {} } as unknown as CaseUI;

      const column = getExtendedFieldTableColumn(
        userPickerField,
        userProfiles
      ) as EuiTableFieldDataColumnType<CaseUI>;
      const { container } = renderWithTestingProviders(<>{column.render?.(theCase, theCase)}</>);

      expect(container).toHaveTextContent('—');
    });

    it('renders plain text (not avatars) for a non-user-picker field', () => {
      const theCase = {
        extendedFields: { priorityAsKeyword: 'high' },
      } as unknown as CaseUI;
      const priorityField = {
        name: 'priority',
        type: 'keyword',
        control: FieldType.INPUT_TEXT,
      } as InlineField;

      const column = getExtendedFieldTableColumn(
        priorityField,
        userProfiles
      ) as EuiTableFieldDataColumnType<CaseUI>;
      renderWithTestingProviders(<>{column.render?.(theCase, theCase)}</>);

      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.queryByTestId('case-table-column-assignee')).not.toBeInTheDocument();
    });

    it('bounds the column width so a single field cannot push the rest off-screen', () => {
      const column = getExtendedFieldTableColumn(userPickerField, userProfiles);
      expect(column.maxWidth).toBe('18em');
      expect(column.minWidth).toBe('6em');
    });

    it('uses unique testSubjPrefixes for two user-picker columns rendered simultaneously', () => {
      const approversField = {
        name: 'approvers',
        type: 'keyword',
        control: FieldType.USER_PICKER,
        label: 'Approvers',
      } as InlineField;
      const theCase = {
        extendedFields: {
          reviewersAsKeyword: JSON.stringify([{ uid: damagedRaccoon.uid, name: 'stale name' }]),
          approversAsKeyword: JSON.stringify([{ uid: damagedRaccoon.uid, name: 'stale name' }]),
        },
      } as unknown as CaseUI;

      const reviewersColumn = getExtendedFieldTableColumn(
        userPickerField,
        userProfiles
      ) as EuiTableFieldDataColumnType<CaseUI>;
      const approversColumn = getExtendedFieldTableColumn(
        approversField,
        userProfiles
      ) as EuiTableFieldDataColumnType<CaseUI>;

      renderWithTestingProviders(
        <>
          {reviewersColumn.render?.(theCase, theCase)}
          {approversColumn.render?.(theCase, theCase)}
        </>
      );

      // Each column's wrapping element must carry a distinct test subject.
      expect(
        screen.getAllByTestId('case-table-column-extendedField-reviewers_as_keyword')
      ).toHaveLength(1);
      expect(
        screen.getAllByTestId('case-table-column-extendedField-approvers_as_keyword')
      ).toHaveLength(1);
    });
  });

  describe('getUserPickerUidsFromCase', () => {
    const userPickerField = {
      name: 'reviewers',
      type: 'keyword',
      control: FieldType.USER_PICKER,
    } as InlineField;
    const textField = {
      name: 'priority',
      type: 'keyword',
      control: FieldType.INPUT_TEXT,
    } as InlineField;

    it('collects uids from every user-picker field on the case', () => {
      const theCase = {
        extendedFields: {
          reviewersAsKeyword: JSON.stringify([
            { uid: 'u-1', name: 'a' },
            { uid: 'u-2', name: 'b' },
          ]),
          priorityAsKeyword: 'high',
        },
      } as unknown as CaseUI;

      expect(getUserPickerUidsFromCase(theCase, [userPickerField, textField])).toEqual([
        'u-1',
        'u-2',
      ]);
    });

    it('returns an empty array when the case has no user-picker value', () => {
      const theCase = { extendedFields: { priorityAsKeyword: 'high' } } as unknown as CaseUI;

      expect(getUserPickerUidsFromCase(theCase, [userPickerField])).toEqual([]);
    });

    it('ignores malformed user-picker JSON without throwing', () => {
      const theCase = {
        extendedFields: { reviewersAsKeyword: 'not-json' },
      } as unknown as CaseUI;

      expect(getUserPickerUidsFromCase(theCase, [userPickerField])).toEqual([]);
    });
  });
});
