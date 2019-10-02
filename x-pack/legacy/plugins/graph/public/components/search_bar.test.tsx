/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchBar, SearchBarProps } from './search_bar';
import React, { ReactElement } from 'react';
import { CoreStart } from 'src/core/public';
import { act } from 'react-dom/test-utils';
import { IndexPattern, QueryBarInput } from 'src/legacy/core_plugins/data/public';

import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { I18nProvider } from '@kbn/i18n/react';

jest.mock('ui/new_platform');

import { openSourceModal } from '../services/source_modal';
import { mount } from 'enzyme';

jest.mock('../services/source_modal', () => ({ openSourceModal: jest.fn() }));

function wrapSearchBarInContext(testProps: SearchBarProps) {
  const services = {
    uiSettings: {
      get: (key: string) => {
        return 10;
      },
    } as CoreStart['uiSettings'],
    savedObjects: {} as CoreStart['savedObjects'],
    notifications: {} as CoreStart['notifications'],
    http: {} as CoreStart['http'],
    overlays: {} as CoreStart['overlays'],
  };

  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <SearchBar {...testProps} />
      </KibanaContextProvider>
    </I18nProvider>
  );
}

describe('search_bar', () => {
  it('should render search bar and submit queryies', () => {
    const querySubmit = jest.fn();
    const instance = mount(
      wrapSearchBarInContext({
        isLoading: false,
        onIndexPatternSelected: () => {},
        onQuerySubmit: querySubmit,
        currentIndexPattern: { title: 'Testpattern' } as IndexPattern,
      })
    );
    act(() => {
      instance.find(QueryBarInput).prop('onChange')!({ language: 'lucene', query: 'testQuery' });
    });

    act(() => {
      instance.find('form').simulate('submit', { preventDefault: () => {} });
    });

    expect(querySubmit).toHaveBeenCalledWith('testQuery');
  });

  it('should translate kql query into JSON dsl', () => {
    const querySubmit = jest.fn();
    const instance = mount(
      wrapSearchBarInContext({
        isLoading: false,
        onIndexPatternSelected: () => {},
        onQuerySubmit: querySubmit,
        currentIndexPattern: { title: 'Testpattern', fields: [{ name: 'test' }] } as IndexPattern,
      })
    );
    act(() => {
      instance.find(QueryBarInput).prop('onChange')!({ language: 'kuery', query: 'test: abc' });
    });

    act(() => {
      instance.find('form').simulate('submit', { preventDefault: () => {} });
    });

    const parsedQuery = JSON.parse(querySubmit.mock.calls[0][0]);
    expect(parsedQuery).toEqual({
      bool: { should: [{ match: { test: 'abc' } }], minimum_should_match: 1 },
    });
  });

  it('should open index pattern picker', () => {
    const indexPatternSelected = jest.fn();

    const instance = mount(
      wrapSearchBarInContext({
        isLoading: false,
        onIndexPatternSelected: indexPatternSelected,
        onQuerySubmit: () => {},
        currentIndexPattern: { title: 'Testpattern' } as IndexPattern,
      })
    );

    // pick the button component out of the tree because
    // it's part of a popover and thus not covered by enzyme
    (instance.find(QueryBarInput).prop('prepend') as ReactElement).props.children.props.onClick();

    expect(openSourceModal).toHaveBeenCalled();
  });
});
