/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MappingsEditor } from '../../mappings_editor';
import { WithAppDependencies } from './helpers/setup_environment';

const onChangeHandler = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Mappings editor: mapped fields', () => {
  const getDocumentFields = () => screen.getByTestId('documentFields');
  const getFieldsListItems = () =>
    within(getDocumentFields()).getAllByTestId((content) => content.startsWith('fieldsListItem '));

  const getFieldListItemByName = (name: string) => {
    const items = getFieldsListItems();
    const item = items.find((it) => {
      const fieldNameEls = within(it).queryAllByTestId(/fieldName/);
      return fieldNameEls.some((el) => {
        if ((el.textContent || '').trim() !== name) return false;

        // Ensure this fieldName belongs to THIS list item, not a nested child item.
        let node: HTMLElement | null = el as HTMLElement;
        while (node && node !== it) {
          const subj = node.getAttribute('data-test-subj');
          if (typeof subj === 'string' && subj.startsWith('fieldsListItem ')) return false;
          node = node.parentElement;
        }

        return true;
      });
    });

    if (!item) {
      throw new Error(`Expected field list item "${name}" to exist`);
    }

    return item;
  };

  type MappingsEditorProps = ComponentProps<typeof MappingsEditor>;

  const setup = (props: Partial<MappingsEditorProps>) => {
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
      // Intentionally separate waits: these nodes can render/settle independently (tree + virtualization),
      // and keeping them separate makes failures much easier to diagnose.
      await waitFor(() => expect(() => getFieldListItemByName('myField')).not.toThrow());
      await waitFor(() => expect(() => getFieldListItemByName('myObject')).not.toThrow());

      // Expand myField to see its multi-fields
      const myFieldListItem = getFieldListItemByName('myField');
      const myFieldExpandButton = within(myFieldListItem).getByRole('button', {
        name: /field myField/i,
      });
      fireEvent.click(myFieldExpandButton);

      // Verify multi-fields appear
      // Intentionally separate waits: each multi-field is its own UI boundary; avoid bundling so we know which one failed.
      await waitFor(() => expect(() => getFieldListItemByName('raw')).not.toThrow());
      await waitFor(() => expect(() => getFieldListItemByName('simpleAnalyzer')).not.toThrow());

      // Expand myObject to see nested properties
      const myObjectListItem = getFieldListItemByName('myObject');
      const myObjectExpandButton = within(myObjectListItem).getByRole('button', {
        name: /field myObject/i,
      });
      fireEvent.click(myObjectExpandButton);

      // Verify nested field appears
      await waitFor(() => expect(() => getFieldListItemByName('deeplyNested')).not.toThrow());

      // Expand deeplyNested
      const deeplyNestedListItem = getFieldListItemByName('deeplyNested');
      const deeplyNestedExpandButton = within(deeplyNestedListItem).getByRole('button', {
        name: /field deeplyNested/i,
      });
      fireEvent.click(deeplyNestedExpandButton);

      // Verify deeply nested title field
      await waitFor(() => expect(() => getFieldListItemByName('title')).not.toThrow());
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

      // Find the root myField list item (avoid "first item wins")
      const rootMyFieldListItem = screen.getByTestId(
        (content) =>
          content.startsWith('fieldsListItem ') &&
          content.includes('myField') &&
          !content.includes('.')
      );

      // Look for the shadowed indicator badge
      const shadowedIndicator = within(rootMyFieldListItem).queryByTestId('isShadowedIndicator');
      expect(shadowedIndicator).toBeInTheDocument();

      // Expand myField to verify nested myField is not shadowed
      const expandButton = within(rootMyFieldListItem).getByTestId('toggleExpandButton');
      fireEvent.click(expandButton);

      // Get all field list items (now includes expanded children)
      // Wait a bit for expansion animation

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
      expect(() => getFieldListItemByName('myField')).not.toThrow();
      expect(() => getFieldListItemByName('myObject')).not.toThrow();

      // Update props with new mappings
      const newMappings = { properties: { hello: { type: 'text' } } };
      const Component = WithAppDependencies(MappingsEditor, {});

      rerender(
        <I18nProvider>
          <Component value={newMappings} onChange={onChangeHandler} indexSettings={{}} />
        </I18nProvider>
      );

      await waitFor(() => expect(() => getFieldListItemByName('hello')).not.toThrow());

      // Old fields should be gone
      expect(() => getFieldListItemByName('myField')).toThrow();
      expect(() => getFieldListItemByName('myObject')).toThrow();
    });
  });
});
