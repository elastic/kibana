/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MappingsEditor } from '../../mappings_editor';
import { WithAppDependencies } from './helpers/setup_environment';

const onChangeHandler = jest.fn();

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Mappings editor: mapped fields', () => {
  const setup = (props: any) => {
    const Component = WithAppDependencies(MappingsEditor, {});
    return render(
      <I18nProvider>
        <Component {...props} />
      </I18nProvider>
    );
  };

  describe('<DocumentFieldsTreeEditor />', () => {
    const defaultMappings = {
      properties: {
        myField: {
          type: 'text',
          fields: {
            raw: {
              type: 'keyword',
            },
            simpleAnalyzer: {
              type: 'text',
            },
          },
        },
        myObject: {
          type: 'object',
          properties: {
            deeplyNested: {
              type: 'object',
              properties: {
                title: {
                  type: 'text',
                  fields: {
                    raw: { type: 'keyword' },
                  },
                },
              },
            },
          },
        },
      },
    };

    test('should correctly represent the fields in the DOM tree', async () => {
      setup({
        value: defaultMappings,
        onChange: onChangeHandler,
        indexSettings: {},
      });

      await screen.findByTestId('mappingsEditor');
      await screen.findByTestId('fieldsList');

      // Find top-level fields
      const myFieldText = await screen.findByText('myField', {
        selector: '[data-test-subj*="fieldName"]',
      });
      expect(myFieldText).toBeInTheDocument();

      const myObjectText = await screen.findByText('myObject', {
        selector: '[data-test-subj*="fieldName"]',
      });
      expect(myObjectText).toBeInTheDocument();

      // Expand myField to see its multi-fields
      const myFieldListItem = myFieldText.closest(
        '[data-test-subj*="fieldsListItem"]'
      ) as HTMLElement;
      const myFieldExpandButton = within(myFieldListItem).getByTestId('toggleExpandButton');
      fireEvent.click(myFieldExpandButton);

      // Verify multi-fields appear
      const rawField = await screen.findByText('raw', {
        selector: '[data-test-subj*="fieldName"]',
      });
      expect(rawField).toBeInTheDocument();

      const simpleAnalyzerField = await screen.findByText('simpleAnalyzer', {
        selector: '[data-test-subj*="fieldName"]',
      });
      expect(simpleAnalyzerField).toBeInTheDocument();

      // Expand myObject to see nested properties
      const myObjectListItem = myObjectText.closest(
        '[data-test-subj*="fieldsListItem"]'
      ) as HTMLElement;
      const myObjectExpandButton = within(myObjectListItem).getByTestId('toggleExpandButton');
      fireEvent.click(myObjectExpandButton);

      // Verify nested field appears
      const deeplyNestedField = await screen.findByText('deeplyNested', {
        selector: '[data-test-subj*="fieldName"]',
      });
      expect(deeplyNestedField).toBeInTheDocument();

      // Expand deeplyNested
      const deeplyNestedListItem = deeplyNestedField.closest(
        '[data-test-subj*="fieldsListItem"]'
      ) as HTMLElement;
      const deeplyNestedExpandButton =
        within(deeplyNestedListItem).getByTestId('toggleExpandButton');
      fireEvent.click(deeplyNestedExpandButton);

      // Verify deeply nested title field
      const titleField = await screen.findByText('title', {
        selector: '[data-test-subj*="fieldName"]',
      });
      expect(titleField).toBeInTheDocument();
    });

    test('should indicate when a field is shadowed by a runtime field', async () => {
      const shadowedMappings = {
        properties: {
          // myField is shadowed by runtime field with same name
          myField: {
            type: 'text',
            fields: {
              // Same name but is not root so not shadowed
              myField: {
                type: 'text',
              },
            },
          },
          myObject: {
            type: 'object',
            properties: {
              // Object properties are also non root fields so not shadowed
              myField: {
                type: 'object',
              },
            },
          },
        },
        runtime: {
          myField: {
            type: 'boolean',
            script: {
              source: 'emit("hello")',
            },
          },
        },
      };

      setup({
        value: shadowedMappings,
        onChange: onChangeHandler,
        indexSettings: {},
      });

      await screen.findByTestId('mappingsEditor');
      await screen.findByTestId('fieldsList');

      // Find the root myField
      const myFieldTexts = screen.getAllByText('myField', {
        selector: '[data-test-subj*="fieldName"]',
      });

      // The first myField at root level should have shadowed indicator
      const rootMyFieldListItem = myFieldTexts[0].closest(
        '[data-test-subj*="fieldsListItem"]'
      ) as HTMLElement;

      // Look for the shadowed indicator badge
      const shadowedIndicator = within(rootMyFieldListItem).queryByTestId('isShadowedIndicator');
      expect(shadowedIndicator).toBeInTheDocument();

      // Expand myField to verify nested myField is not shadowed
      const expandButton = within(rootMyFieldListItem).getByTestId('toggleExpandButton');
      fireEvent.click(expandButton);

      // Get all field list items (now includes expanded children)
      // Wait a bit for expansion animation
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      const allFieldItems = screen.getAllByTestId(/fieldsListItem/);

      // Count shadowed indicators - should be exactly 1 (only root myField)
      const shadowedIndicators = allFieldItems.filter((item) =>
        within(item).queryByTestId('isShadowedIndicator')
      );
      expect(shadowedIndicators).toHaveLength(1);
    });

    test('should allow to be controlled by parent component and update on prop change', async () => {
      const { rerender } = setup({
        value: defaultMappings,
        onChange: onChangeHandler,
        indexSettings: {},
      });

      await screen.findByTestId('mappingsEditor');
      await screen.findByTestId('fieldsList');

      // Verify initial fields
      expect(
        screen.getByText('myField', { selector: '[data-test-subj*="fieldName"]' })
      ).toBeInTheDocument();
      expect(
        screen.getByText('myObject', { selector: '[data-test-subj*="fieldName"]' })
      ).toBeInTheDocument();

      // Update props with new mappings
      const newMappings = { properties: { hello: { type: 'text' } } };
      const Component = WithAppDependencies(MappingsEditor, {});

      rerender(
        <I18nProvider>
          <Component value={newMappings} onChange={onChangeHandler} indexSettings={{}} />
        </I18nProvider>
      );

      // Wait for new field to appear
      const helloField = await screen.findByText('hello', {
        selector: '[data-test-subj*="fieldName"]',
      });
      expect(helloField).toBeInTheDocument();

      // Old fields should be gone
      expect(
        screen.queryByText('myField', { selector: '[data-test-subj*="fieldName"]' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('myObject', { selector: '[data-test-subj*="fieldName"]' })
      ).not.toBeInTheDocument();
    });
  });
});
