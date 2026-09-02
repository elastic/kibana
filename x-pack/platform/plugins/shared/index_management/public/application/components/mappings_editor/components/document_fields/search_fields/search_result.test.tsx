/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ConfigProvider } from '../../../config_context';
import { StateProvider } from '../../../mappings_state_context';
import type { SearchResult as Result } from '../../../types';

import { SearchResult } from './search_result';

describe('SearchResult', () => {
  const renderComponent = (props: React.ComponentProps<typeof SearchResult>) => {
    return render(
      <I18nProvider>
        <ConfigProvider>
          <StateProvider>
            <SearchResult {...props} />
          </StateProvider>
        </ConfigProvider>
      </I18nProvider>
    );
  };

  it('should render an empty prompt if the result is empty', () => {
    const result: Result[] = [];

    renderComponent({
      result,
      documentFieldsState: {
        fieldToEdit: undefined,
        status: 'idle',
        editor: 'default',
      },
    });

    const emptyPrompt = screen.getByTestId('mappingsEditorSearchResultEmptyPrompt');
    expect(emptyPrompt).toBeInTheDocument();
  });

  it('should render a list of fields if the result is not empty', () => {
    const result = [
      {
        field: {
          id: 'testField',
          nestedDepth: 0,
          path: ['testField'],
          source: {
            type: 'text',
            name: 'testField',
          },
          isMultiField: false,
        },
        display: <div>testField</div>,
      },
    ] as Result[];

    renderComponent({
      result,
      documentFieldsState: {
        fieldToEdit: undefined,
        status: 'idle',
        editor: 'default',
      },
    });

    const searchResult = screen.getByTestId('mappingsEditorSearchResult');
    expect(searchResult).toBeInTheDocument();
  });
});
