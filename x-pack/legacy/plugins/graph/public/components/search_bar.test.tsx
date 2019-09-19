/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchBar } from './search_bar';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React, { ReactElement } from 'react';
import { CoreStart } from 'src/core/public';
import { IndexPatternSavedObject } from '../types';
import { act } from 'react-dom/test-utils';
import { EuiFieldText } from '@elastic/eui';
import { openSourceModal } from '../services/source_modal';

jest.mock('../services/source_modal', () => ({ openSourceModal: jest.fn() }));

// TODO fix tests
describe('search_bar', () => {
  it('should render search bar and submit queryies', () => {
    const querySubmit = jest.fn();
    const instance = shallowWithIntl(
      <SearchBar
        isLoading={false}
        onIndexPatternSelected={() => {}}
        onQuerySubmit={querySubmit}
        savedObjects={{} as CoreStart['savedObjects']}
        uiSettings={{} as CoreStart['uiSettings']}
        overlays={{} as CoreStart['overlays']}
        currentIndexPattern={{ attributes: { title: 'Testpattern' } } as IndexPatternSavedObject}
      />
    );
    act(() => {
      instance.find(EuiFieldText).simulate('change', { target: { value: 'testQuery' } });
    });

    act(() => {
      instance.find('form').simulate('submit', { preventDefault: () => {} });
    });

    expect(querySubmit).toHaveBeenCalledWith('testQuery');
  });

  it('should render index pattern picker', () => {
    const indexPatternSelected = jest.fn();
    const instance = shallowWithIntl(
      <SearchBar
        isLoading={false}
        onIndexPatternSelected={indexPatternSelected}
        onQuerySubmit={() => {}}
        savedObjects={{} as CoreStart['savedObjects']}
        uiSettings={{} as CoreStart['uiSettings']}
        overlays={{} as CoreStart['overlays']}
        currentIndexPattern={{ attributes: { title: 'Testpattern' } } as IndexPatternSavedObject}
      />
    );

    // pick the button component out of the tree because
    // it's part of a popover and thus not covered by enzyme
    (instance.find(EuiFieldText).prop('prepend') as ReactElement).props.children.props.onClick();

    expect(openSourceModal).toHaveBeenCalled();
  });
});
