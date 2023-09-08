/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { omit } from 'lodash/fp';
import React from 'react';

import {
  EMPTY_PLACEHOLDER,
  getCustomTableColumns,
  getEcsCompliantTableColumns,
  getIncompatibleValuesTableColumns,
} from './helpers';
import {
  eventCategory,
  eventCategoryWithUnallowedValues,
  someField,
} from '../mock/enriched_field_metadata/mock_enriched_field_metadata';
import { TestProviders } from '../mock/test_providers/test_providers';

describe('helpers', () => {
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
          <TestProviders>
            <>
              {indexFieldTypeRender != null &&
                indexFieldTypeRender(someField.indexFieldType, someField)}
            </>
          </TestProviders>
        );

        expect(screen.getByTestId('indexFieldType')).toHaveTextContent(someField.indexFieldType);
      });
    });
  });

  describe('getEcsCompliantTableColumns', () => {
    test('it returns the expected columns', () => {
      expect(getEcsCompliantTableColumns().map((x) => omit('render', x))).toEqual([
        {
          field: 'indexFieldName',
          name: 'Field',
          sortable: true,
          truncateText: false,
          width: '25%',
        },
        {
          field: 'type',
          name: 'ECS mapping type',
          sortable: true,
          truncateText: false,
          width: '25%',
        },
        {
          field: 'allowed_values',
          name: 'ECS values',
          sortable: false,
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

    describe('type render()', () => {
      describe('when `type` exists', () => {
        beforeEach(() => {
          const columns = getEcsCompliantTableColumns();
          const typeRender = columns[1].render;

          render(
            <TestProviders>
              <>{typeRender != null && typeRender(eventCategory.type, eventCategory)}</>
            </TestProviders>
          );
        });

        test('it renders the expected `type`', () => {
          expect(screen.getByTestId('type')).toHaveTextContent('keyword');
        });

        test('it does NOT render the placeholder', () => {
          expect(screen.queryByTestId('typePlaceholder')).not.toBeInTheDocument();
        });
      });

      describe('when `type` is undefined', () => {
        beforeEach(() => {
          const withUndefinedType = {
            ...eventCategory,
            type: undefined, // <--
          };
          const columns = getEcsCompliantTableColumns();
          const typeRender = columns[1].render;

          render(
            <TestProviders>
              <>{typeRender != null && typeRender(withUndefinedType.type, withUndefinedType)}</>
            </TestProviders>
          );
        });

        test('it does NOT render the `type`', () => {
          expect(screen.queryByTestId('type')).not.toBeInTheDocument();
        });

        test('it renders the placeholder', () => {
          expect(screen.getByTestId('typePlaceholder')).toHaveTextContent(EMPTY_PLACEHOLDER);
        });
      });
    });

    describe('allowed values render()', () => {
      describe('when `allowedValues` exists', () => {
        beforeEach(() => {
          const columns = getEcsCompliantTableColumns();
          const allowedValuesRender = columns[2].render;

          render(
            <TestProviders>
              <>
                {allowedValuesRender != null &&
                  allowedValuesRender(eventCategory.allowed_values, eventCategory)}
              </>
            </TestProviders>
          );
        });

        test('it renders the expected `AllowedValue` names', () => {
          expect(screen.getByTestId('ecsAllowedValues')).toHaveTextContent(
            eventCategory.allowed_values?.map(({ name }) => name).join('') ?? ''
          );
        });

        test('it does NOT render the placeholder', () => {
          expect(screen.queryByTestId('ecsAllowedValuesEmpty')).not.toBeInTheDocument();
        });
      });

      describe('when `allowedValues` is undefined', () => {
        const withUndefinedAllowedValues = {
          ...eventCategory,
          allowed_values: undefined, // <--
        };

        beforeEach(() => {
          const columns = getEcsCompliantTableColumns();
          const allowedValuesRender = columns[2].render;

          render(
            <TestProviders>
              <>
                {allowedValuesRender != null &&
                  allowedValuesRender(
                    withUndefinedAllowedValues.allowed_values,
                    withUndefinedAllowedValues
                  )}
              </>
            </TestProviders>
          );
        });

        test('it does NOT render the `AllowedValue` names', () => {
          expect(screen.queryByTestId('ecsAllowedValues')).not.toBeInTheDocument();
        });

        test('it renders the placeholder', () => {
          expect(screen.getByTestId('ecsAllowedValuesEmpty')).toBeInTheDocument();
        });
      });
    });

    describe('description render()', () => {
      describe('when `description` exists', () => {
        beforeEach(() => {
          const columns = getEcsCompliantTableColumns();
          const descriptionRender = columns[3].render;

          render(
            <TestProviders>
              <>
                {descriptionRender != null &&
                  descriptionRender(eventCategory.description, eventCategory)}
              </>
            </TestProviders>
          );
        });

        test('it renders the expected `description`', () => {
          expect(screen.getByTestId('description')).toHaveTextContent(
            eventCategory.description?.replaceAll('\n', ' ') ?? ''
          );
        });

        test('it does NOT render the placeholder', () => {
          expect(screen.queryByTestId('emptyPlaceholder')).not.toBeInTheDocument();
        });
      });

      describe('when `description` is undefined', () => {
        const withUndefinedDescription = {
          ...eventCategory,
          description: undefined, // <--
        };

        beforeEach(() => {
          const columns = getEcsCompliantTableColumns();
          const descriptionRender = columns[3].render;

          render(
            <TestProviders>
              <>
                {descriptionRender != null &&
                  descriptionRender(withUndefinedDescription.description, withUndefinedDescription)}
              </>
            </TestProviders>
          );
        });

        test('it does NOT render the `description`', () => {
          expect(screen.queryByTestId('description')).not.toBeInTheDocument();
        });

        test('it renders the placeholder', () => {
          expect(screen.getByTestId('emptyPlaceholder')).toBeInTheDocument();
        });
      });
    });
  });

  describe('getIncompatibleValuesTableColumns', () => {
    test('it returns the expected columns', () => {
      expect(getIncompatibleValuesTableColumns().map((x) => omit('render', x))).toEqual([
        {
          field: 'indexFieldName',
          name: 'Field',
          sortable: true,
          truncateText: false,
          width: '25%',
        },
        {
          field: 'allowed_values',
          name: 'ECS values (expected)',
          sortable: false,
          truncateText: false,
          width: '25%',
        },
        {
          field: 'indexInvalidValues',
          name: 'Document values (actual)',
          sortable: false,
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

    describe('allowed values render()', () => {
      describe('when `allowedValues` exists', () => {
        beforeEach(() => {
          const columns = getIncompatibleValuesTableColumns();
          const allowedValuesRender = columns[1].render;

          render(
            <TestProviders>
              <>
                {allowedValuesRender != null &&
                  allowedValuesRender(eventCategory.allowed_values, eventCategory)}
              </>
            </TestProviders>
          );
        });

        test('it renders the expected `AllowedValue` names', () => {
          expect(screen.getByTestId('ecsAllowedValues')).toHaveTextContent(
            eventCategory.allowed_values?.map(({ name }) => name).join('') ?? ''
          );
        });

        test('it does NOT render the placeholder', () => {
          expect(screen.queryByTestId('ecsAllowedValuesEmpty')).not.toBeInTheDocument();
        });
      });

      describe('when `allowedValues` is undefined', () => {
        const withUndefinedAllowedValues = {
          ...eventCategory,
          allowed_values: undefined, // <--
        };

        beforeEach(() => {
          const columns = getIncompatibleValuesTableColumns();
          const allowedValuesRender = columns[1].render;

          render(
            <TestProviders>
              <>
                {allowedValuesRender != null &&
                  allowedValuesRender(
                    withUndefinedAllowedValues.allowed_values,
                    withUndefinedAllowedValues
                  )}
              </>
            </TestProviders>
          );
        });

        test('it does NOT render the `AllowedValue` names', () => {
          expect(screen.queryByTestId('ecsAllowedValues')).not.toBeInTheDocument();
        });

        test('it renders the placeholder', () => {
          expect(screen.getByTestId('ecsAllowedValuesEmpty')).toBeInTheDocument();
        });
      });
    });

    describe('indexInvalidValues render()', () => {
      describe('when `indexInvalidValues` is populated', () => {
        beforeEach(() => {
          const columns = getIncompatibleValuesTableColumns();
          const indexInvalidValuesRender = columns[2].render;

          render(
            <TestProviders>
              <>
                {indexInvalidValuesRender != null &&
                  indexInvalidValuesRender(
                    eventCategoryWithUnallowedValues.indexInvalidValues,
                    eventCategoryWithUnallowedValues
                  )}
              </>
            </TestProviders>
          );
        });

        test('it renders the expected `indexInvalidValues`', () => {
          expect(screen.getByTestId('indexInvalidValues')).toHaveTextContent(
            'an_invalid_category (2)theory (1)'
          );
        });

        test('it does NOT render the placeholder', () => {
          expect(screen.queryByTestId('emptyPlaceholder')).not.toBeInTheDocument();
        });
      });

      describe('when `indexInvalidValues` is empty', () => {
        beforeEach(() => {
          const columns = getIncompatibleValuesTableColumns();
          const indexInvalidValuesRender = columns[2].render;

          render(
            <TestProviders>
              <>
                {indexInvalidValuesRender != null &&
                  indexInvalidValuesRender(eventCategory.indexInvalidValues, eventCategory)}
              </>
            </TestProviders>
          );
        });

        test('it does NOT render the index invalid values', () => {
          expect(screen.queryByTestId('indexInvalidValues')).not.toBeInTheDocument();
        });

        test('it renders the placeholder', () => {
          expect(screen.getByTestId('emptyPlaceholder')).toBeInTheDocument();
        });
      });
    });
  });
});
