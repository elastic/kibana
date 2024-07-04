/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { omit } from 'lodash/fp';
import React from 'react';

import { SAME_FAMILY } from '../../data_quality_panel/same_family/translations';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { eventCategory } from '../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { EcsBasedFieldMetadata } from '../../types';
import { getIncompatibleMappingsTableColumns } from '.';

describe('getIncompatibleMappingsTableColumns', () => {
  test('it returns the expected column configuration', () => {
    const columns = getIncompatibleMappingsTableColumns().map((x) => omit('render', x));

    expect(columns).toEqual([
      {
        field: 'indexFieldName',
        name: 'Field',
        sortable: true,
        truncateText: false,
        width: '25%',
      },
      {
        field: 'type',
        name: 'ECS mapping type (expected)',
        sortable: true,
        truncateText: false,
        width: '25%',
      },
      {
        field: 'indexFieldType',
        name: 'Index mapping type (actual)',
        sortable: true,
        truncateText: false,
        width: '25%',
      },
      {
        field: 'description',
        name: 'ECS description',
        sortable: false,
        truncateText: false,
        width: '25%',
      },
    ]);
  });

  describe('type column render()', () => {
    test('it renders the expected type', () => {
      const columns = getIncompatibleMappingsTableColumns();
      const typeColumnRender = columns[1].render;
      const expected = 'keyword';

      render(
        <TestProviders>
          {typeColumnRender != null && typeColumnRender(eventCategory.type, eventCategory)}
        </TestProviders>
      );

      expect(screen.getByTestId('codeSuccess')).toHaveTextContent(expected);
    });
  });

  describe('indexFieldType column render()', () => {
    describe("when the index field type does NOT match the ECS type, but it's in the SAME family", () => {
      const indexFieldType = 'wildcard';

      beforeEach(() => {
        const columns = getIncompatibleMappingsTableColumns();
        const indexFieldTypeColumnRender = columns[2].render;

        const withTypeMismatchSameFamily: EcsBasedFieldMetadata = {
          ...eventCategory, // `event.category` is a `keyword` per the ECS spec
          indexFieldType, // this index has a mapping of `wildcard` instead of `keyword`
          isInSameFamily: true, // `wildcard` and `keyword` are in the same family
        };

        render(
          <TestProviders>
            {indexFieldTypeColumnRender != null &&
              indexFieldTypeColumnRender(
                withTypeMismatchSameFamily.indexFieldType,
                withTypeMismatchSameFamily
              )}
          </TestProviders>
        );
      });

      test('it renders the expected type with a "success" style', () => {
        expect(screen.getByTestId('codeSuccess')).toHaveTextContent(indexFieldType);
      });

      test('it renders the same family badge', () => {
        expect(screen.getByTestId('sameFamily')).toHaveTextContent(SAME_FAMILY);
      });
    });

    describe("when the index field type does NOT match the ECS type, but it's in a DIFFERENT family", () => {
      const indexFieldType = 'text';

      test('it renders the expected type with danger styling', () => {
        const columns = getIncompatibleMappingsTableColumns();
        const indexFieldTypeColumnRender = columns[2].render;

        const withTypeMismatchDifferentFamily: EcsBasedFieldMetadata = {
          ...eventCategory, // `event.category` is a `keyword` per the ECS spec
          indexFieldType, // this index has a mapping of `text` instead of `keyword`
          isInSameFamily: false, // `text` and `wildcard` are not in the same family
        };

        render(
          <TestProviders>
            {indexFieldTypeColumnRender != null &&
              indexFieldTypeColumnRender(
                withTypeMismatchDifferentFamily.indexFieldType,
                withTypeMismatchDifferentFamily
              )}
          </TestProviders>
        );

        expect(screen.getByTestId('codeDanger')).toHaveTextContent(indexFieldType);
      });
    });
  });
});
