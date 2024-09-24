/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE } from '../incompatible_tab/translations';
import { eventCategory } from '../../../../../../../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { TestExternalProviders } from '../../../../../../../../mock/test_providers/test_providers';
import { CompareFieldsTable } from '.';
import { getIncompatibleMappingsTableColumns } from './get_incompatible_mappings_table_columns';

describe('CompareFieldsTable', () => {
  describe('rendering', () => {
    beforeEach(() => {
      render(
        <TestExternalProviders>
          <CompareFieldsTable
            enrichedFieldMetadata={[eventCategory]}
            getTableColumns={getIncompatibleMappingsTableColumns}
            title={INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE('foo')}
          />
        </TestExternalProviders>
      );
    });

    test('it renders the expected title', () => {
      expect(screen.getByTestId('title')).toHaveTextContent('Incompatible field mappings - foo');
    });

    test('it renders the table', () => {
      expect(screen.getByTestId('table')).toBeInTheDocument();
    });
  });
});
