/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { StateProvider } from '../../../mappings_state_context';

import { SearchResultItem } from './search_result_item';
import type { SearchResult } from '../../../types';

describe('SearchResultItem', () => {
  const item = {
    field: {
      id: 'testField',
      nestedDepth: 2,
      path: ['foo', 'bar', 'baz'],
      source: {
        type: 'text',
        name: 'baz',
      },
      isMultiField: false,
    },
    display: <div>{'foo > bar > baz'}</div>,
  } as SearchResult;

  const renderComponent = (props: React.ComponentProps<typeof SearchResultItem>) => {
    return render(
      <I18nProvider>
        <StateProvider>
          <SearchResultItem {...props} />
        </StateProvider>
      </I18nProvider>
    );
  };

  it('should display the field name and a badge to indicate its type', () => {
    renderComponent({
      item,
      areActionButtonsVisible: false,
      isHighlighted: false,
      isDimmed: false,
    });

    const fieldName = screen.getByTestId('fieldName');
    expect(fieldName).toBeInTheDocument();
    expect(fieldName.textContent).toEqual('foo > bar > baz');

    const fieldType = screen.getByTestId('fieldType');
    expect(fieldType).toBeInTheDocument();
    expect(fieldType.textContent).toEqual('Text');
  });

  it('should show multi-field badge if the field is a multi-field', () => {
    const multiFieldItem = {
      ...item,
      field: {
        ...item.field,
        isMultiField: true,
      },
    };

    renderComponent({
      item: multiFieldItem,
      areActionButtonsVisible: false,
      isHighlighted: false,
      isDimmed: false,
    });

    const fieldType = screen.getByTestId('fieldType');
    expect(fieldType).toBeInTheDocument();
    expect(fieldType.textContent).toEqual('Text multi-field');
  });

  it('should render action buttons if "areActionButtonsVisible" is true', () => {
    renderComponent({
      item,
      areActionButtonsVisible: true,
      isHighlighted: false,
      isDimmed: false,
    });

    const fieldActions = screen.getByTestId('fieldActions');
    expect(fieldActions).toBeInTheDocument();
  });

  it('should fall back to source type if the field type is not found in the type definition', () => {
    const itemWithUnknownType = {
      ...item,
      field: {
        ...item.field,
        isMultiField: true,
        source: {
          ...item.field.source,
          type: 'unknown',
        },
      },
    };

    renderComponent({
      item: itemWithUnknownType as SearchResult,
      areActionButtonsVisible: true,
      isHighlighted: false,
      isDimmed: false,
    });

    const fieldType = screen.getByTestId('fieldType');
    expect(fieldType).toBeInTheDocument();
    expect(fieldType.textContent).toEqual('unknown multi-field');
  });
});
