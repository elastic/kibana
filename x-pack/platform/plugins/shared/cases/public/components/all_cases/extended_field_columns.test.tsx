/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithTestingProviders } from '../../common/mock';
import type { CaseUI } from '../../../common/ui/types';
import type { InlineField } from '../../../common/types/domain/template/fields';
import { FieldType } from '../../../common/types/domain/template/fields';
import {
  getExtendedFieldCellValue,
  getExtendedFieldColumnKey,
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
});
