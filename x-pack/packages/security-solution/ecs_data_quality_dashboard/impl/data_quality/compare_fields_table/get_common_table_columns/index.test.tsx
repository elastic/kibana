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
import {
  eventCategory,
  eventCategoryWithUnallowedValues,
} from '../../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { TestProviders } from '../../mock/test_providers/test_providers';
import {
  DOCUMENT_VALUES_ACTUAL,
  ECS_DESCRIPTION,
  ECS_MAPPING_TYPE_EXPECTED,
  ECS_VALUES_EXPECTED,
  FIELD,
  INDEX_MAPPING_TYPE_ACTUAL,
} from '../translations';
import { EnrichedFieldMetadata } from '../../types';
import { EMPTY_PLACEHOLDER, getCommonTableColumns } from '.';

describe('getCommonTableColumns', () => {
  test('it returns the expected column configuration', () => {
    expect(getCommonTableColumns().map((x) => omit('render', x))).toEqual([
      { field: 'indexFieldName', name: FIELD, sortable: true, truncateText: false, width: '20%' },
      {
        field: 'type',
        name: ECS_MAPPING_TYPE_EXPECTED,
        sortable: true,
        truncateText: false,
        width: '15%',
      },
      {
        field: 'indexFieldType',
        name: INDEX_MAPPING_TYPE_ACTUAL,
        sortable: true,
        truncateText: false,
        width: '15%',
      },
      {
        field: 'allowed_values',
        name: ECS_VALUES_EXPECTED,
        sortable: false,
        truncateText: false,
        width: '15%',
      },
      {
        field: 'indexInvalidValues',
        name: DOCUMENT_VALUES_ACTUAL,
        sortable: false,
        truncateText: false,
        width: '15%',
      },
      {
        field: 'description',
        name: ECS_DESCRIPTION,
        sortable: false,
        truncateText: false,
        width: '20%',
      },
    ]);
  });

  describe('type column render()', () => {
    test('it renders the expected type', () => {
      const columns = getCommonTableColumns();
      const typeColumnRender = columns[1].render;
      const expected = 'keyword';

      render(
        <TestProviders>
          {typeColumnRender != null && typeColumnRender(eventCategory.type, eventCategory)}
        </TestProviders>
      );

      expect(screen.getByTestId('codeSuccess')).toHaveTextContent(expected);
    });

    test('it renders an empty placeholder when type is undefined', () => {
      const columns = getCommonTableColumns();
      const typeColumnRender = columns[1].render;

      render(
        <TestProviders>
          {typeColumnRender != null && typeColumnRender(undefined, eventCategory)}
        </TestProviders>
      );

      expect(screen.getByTestId('codeSuccess')).toHaveTextContent(EMPTY_PLACEHOLDER);
    });
  });

  describe('indexFieldType column render()', () => {
    describe("when the index field type does NOT match the ECS type, but it's in the SAME family", () => {
      const indexFieldType = 'wildcard';

      beforeEach(() => {
        const columns = getCommonTableColumns();
        const indexFieldTypeColumnRender = columns[2].render;

        const withTypeMismatchSameFamily: EnrichedFieldMetadata = {
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

      test('it renders the expected type as a warning', () => {
        expect(screen.getByTestId('codeWarning')).toHaveTextContent(indexFieldType);
      });

      test('it renders the same family badge', () => {
        expect(screen.getByTestId('sameFamily')).toHaveTextContent(SAME_FAMILY);
      });
    });

    describe("when the index field type does NOT match the ECS type, but it's in a DIFFERENT family", () => {
      const indexFieldType = 'text';

      test('it renders the expected type with danger styling', () => {
        const columns = getCommonTableColumns();
        const indexFieldTypeColumnRender = columns[2].render;

        const withTypeMismatchDifferentFamily: EnrichedFieldMetadata = {
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

    describe('when the index field matches the ECS type', () => {
      test('it renders the expected type with success styling', () => {
        const columns = getCommonTableColumns();
        const indexFieldTypeColumnRender = columns[2].render;

        render(
          <TestProviders>
            {indexFieldTypeColumnRender != null &&
              indexFieldTypeColumnRender(eventCategory.indexFieldType, eventCategory)}
          </TestProviders>
        );

        expect(screen.getByTestId('codeSuccess')).toHaveTextContent(eventCategory.indexFieldType);
      });
    });
  });

  describe('allowed_values column render()', () => {
    test('it renders the expected allowed values when provided', () => {
      const columns = getCommonTableColumns();
      const allowedValuesolumnRender = columns[3].render;

      const expectedAllowedValuesNames =
        eventCategory.allowed_values != null
          ? eventCategory.allowed_values.map((x) => x.name).join('')
          : 'unexpected';

      render(
        <TestProviders>
          {allowedValuesolumnRender != null &&
            allowedValuesolumnRender(eventCategory.allowed_values, eventCategory)}
        </TestProviders>
      );

      expect(screen.getByTestId('ecsAllowedValues')).toHaveTextContent(expectedAllowedValuesNames);
    });

    test('it renders a placeholder when allowed values is undefined', () => {
      const columns = getCommonTableColumns();
      const allowedValuesolumnRender = columns[3].render;

      const withUndefinedAllowedValues: EnrichedFieldMetadata = {
        ...eventCategory,
        allowed_values: undefined,
      };

      render(
        <TestProviders>
          {allowedValuesolumnRender != null &&
            allowedValuesolumnRender(undefined, withUndefinedAllowedValues)}
        </TestProviders>
      );

      expect(screen.getByTestId('ecsAllowedValuesEmpty')).toHaveTextContent(EMPTY_PLACEHOLDER);
    });
  });

  describe('indexInvalidValues column render()', () => {
    test('it renders the expected index invalid values', () => {
      const columns = getCommonTableColumns();
      const indexInvalidValuesRender = columns[4].render;

      render(
        <TestProviders>
          {indexInvalidValuesRender != null &&
            indexInvalidValuesRender(
              eventCategoryWithUnallowedValues.indexInvalidValues,
              eventCategoryWithUnallowedValues
            )}
        </TestProviders>
      );

      expect(screen.getByTestId('indexInvalidValues')).toHaveTextContent(
        'an_invalid_category (2)theory (1)'
      );
    });
  });

  describe('description column render()', () => {
    test('it renders the expected description', () => {
      const columns = getCommonTableColumns();
      const descriptionolumnRender = columns[5].render;
      const expectedDescription = 'this is a test';

      const withDescription: EnrichedFieldMetadata = {
        ...eventCategory,
        description: expectedDescription,
      };

      render(
        <TestProviders>
          {descriptionolumnRender != null &&
            descriptionolumnRender(withDescription.description, withDescription)}
        </TestProviders>
      );

      expect(screen.getByTestId('description')).toHaveTextContent(expectedDescription);
    });

    test('it renders a placeholder when description is undefined', () => {
      const columns = getCommonTableColumns();
      const descriptionolumnRender = columns[5].render;

      const withDescription: EnrichedFieldMetadata = {
        ...eventCategory,
        description: undefined,
      };

      render(
        <TestProviders>
          {descriptionolumnRender != null &&
            descriptionolumnRender(withDescription.description, withDescription)}
        </TestProviders>
      );

      expect(screen.getByTestId('emptyDescription')).toHaveTextContent(EMPTY_PLACEHOLDER);
    });
  });
});
