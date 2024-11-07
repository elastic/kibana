/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { omit } from 'lodash/fp';
import { getCustomTableColumns } from './get_custom_table_columns';
import { render, screen } from '@testing-library/react';

import { TestExternalProviders } from '../../../../../../../../mock/test_providers/test_providers';
import { someField } from '../../../../../../../../mock/enriched_field_metadata/mock_enriched_field_metadata';

describe('getCustomTableColumns', () => {
  test('it returns the expected columns', () => {
    expect(getCustomTableColumns().map((x) => omit('render', x))).toEqual([
      {
        field: 'indexFieldName',
        name: 'Field',
        sortable: true,
        truncateText: false,
        width: '50%',
      },
      {
        field: 'indexFieldType',
        name: 'Index mapping type',
        sortable: true,
        truncateText: false,
        width: '50%',
      },
    ]);
  });

  describe('indexFieldType render()', () => {
    test('it renders the indexFieldType', () => {
      const columns = getCustomTableColumns();
      const indexFieldTypeRender = columns[1].render;

      render(
        <TestExternalProviders>
          <>
            {indexFieldTypeRender != null &&
              indexFieldTypeRender(someField.indexFieldType, someField)}
          </>
        </TestExternalProviders>
      );

      expect(screen.getByTestId('indexFieldType')).toHaveTextContent(someField.indexFieldType);
    });
  });
});
