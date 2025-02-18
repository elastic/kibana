/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StateProvider } from '../../../mappings_state_context';
import type { SearchResult as Result } from '../../../types';

import { mountWithIntl } from '@kbn/test-jest-helpers';

import { SearchResult } from './search_result';

describe('SearchResult', () => {
  it('should render an empty prompt if the result is empty', () => {
    const result: Result[] = [];

    const tree = mountWithIntl(
      <StateProvider>
        <SearchResult
          result={result}
          documentFieldsState={{
            fieldToEdit: undefined,
            status: 'idle',
            editor: 'default',
          }}
        />
      </StateProvider>
    );

    expect(
      tree
        .find('SearchResult')
        .find('[data-test-subj="mappingsEditorSearchResultEmptyPrompt"]')
        .exists()
    ).toBe(true);
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

    const tree = mountWithIntl(
      <StateProvider>
        <SearchResult
          result={result}
          documentFieldsState={{
            fieldToEdit: undefined,
            status: 'idle',
            editor: 'default',
          }}
        />
      </StateProvider>
    );

    expect(tree.find('[data-test-subj="mappingsEditorSearchResult"]').exists()).toBe(true);
  });
});
