/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import sinon from 'sinon';

import { SearchScope } from '../../../../model';
import { AutocompleteSuggestionType } from '../suggestions';
import props from './__fixtures__/props.json';
import { CodeQueryBar } from './query_bar';

// Injest a mock random function to fixiate the output for generating component id.
const mockMath = Object.create(global.Math);
mockMath.random = () => 0.5;
global.Math = mockMath;

test('render correctly with empty query string', () => {
  const emptyFn = () => {
    return;
  };
  const queryBarComp = mount(
    <CodeQueryBar
      repositorySearch={emptyFn}
      saveSearchOptions={emptyFn}
      repoSearchResults={[]}
      searchLoading={false}
      searchOptions={{ repoScope: [], defaultRepoScopeOn: false }}
      query=""
      disableAutoFocus={false}
      appName="mockapp"
      suggestionProviders={[]}
      enableSubmitWhenOptionsChanged={false}
      onSubmit={emptyFn}
      onSelect={emptyFn}
      onSearchScopeChanged={emptyFn}
      searchScope={SearchScope.DEFAULT}
      defaultRepoOptions={[]}
    />
  );
  expect(toJson(queryBarComp)).toMatchSnapshot();
});

test('render correctly with input query string changed', done => {
  const emptyFn = () => {
    return;
  };

  const fileSuggestionsSpy = sinon.fake.returns(
    Promise.resolve(props[AutocompleteSuggestionType.FILE])
  );
  const symbolSuggestionsSpy = sinon.fake.returns(
    Promise.resolve(props[AutocompleteSuggestionType.SYMBOL])
  );
  const repoSuggestionsSpy = sinon.fake.returns(
    Promise.resolve(props[AutocompleteSuggestionType.REPOSITORY])
  );

  const mockFileSuggestionsProvider = { getSuggestions: fileSuggestionsSpy };
  const mockSymbolSuggestionsProvider = { getSuggestions: symbolSuggestionsSpy };
  const mockRepositorySuggestionsProvider = { getSuggestions: repoSuggestionsSpy };
  const submitSpy = sinon.spy();

  const queryBarComp = mount(
    <MemoryRouter initialEntries={[{ pathname: '/', key: 'testKey' }]}>
      <CodeQueryBar
        repositorySearch={emptyFn}
        saveSearchOptions={emptyFn}
        repoSearchResults={[]}
        searchLoading={false}
        searchOptions={{ repoScope: [], defaultRepoScopeOn: false }}
        query="mockquery"
        disableAutoFocus={false}
        appName="mockapp"
        suggestionProviders={[
          mockFileSuggestionsProvider,
          mockSymbolSuggestionsProvider,
          mockRepositorySuggestionsProvider,
        ]}
        enableSubmitWhenOptionsChanged={false}
        onSubmit={submitSpy}
        onSelect={emptyFn}
        onSearchScopeChanged={emptyFn}
        searchScope={SearchScope.DEFAULT}
        defaultRepoOptions={[]}
      />
    </MemoryRouter>
  );

  // Input 'mockquery' in the query bar.
  queryBarComp
    .find('input[type="text"]')
    .at(0)
    .simulate('change', { target: { value: 'mockquery' } });

  // Wait for 101ms to make sure the getSuggestions has been triggered.
  setTimeout(() => {
    expect(toJson(queryBarComp)).toMatchSnapshot();
    expect(fileSuggestionsSpy.calledOnce).toBeTruthy();
    expect(symbolSuggestionsSpy.calledOnce).toBeTruthy();
    expect(repoSuggestionsSpy.calledOnce).toBeTruthy();

    // Hit enter
    queryBarComp
      .find('input[type="text"]')
      .at(0)
      .simulate('keyDown', { keyCode: 13, key: 'Enter', metaKey: true });
    expect(submitSpy.calledOnce).toBeTruthy();

    done();
  }, 1000);
});

test('invokes onSearchScopeChanged and gets new suggestions when the scope is changed', async () => {
  const noOp = () => {};
  const wait = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

  const fileSuggestionsSpy = jest.fn(() => Promise.resolve(props[AutocompleteSuggestionType.FILE]));
  const symbolSuggestionsSpy = jest.fn(() =>
    Promise.resolve(props[AutocompleteSuggestionType.SYMBOL])
  );
  const repoSuggestionsSpy = jest.fn(() =>
    Promise.resolve(props[AutocompleteSuggestionType.REPOSITORY])
  );
  const suggestionsProviderSpies = [
    { getSuggestions: fileSuggestionsSpy },
    { getSuggestions: symbolSuggestionsSpy },
    { getSuggestions: repoSuggestionsSpy },
  ];
  const onSearchScopeChangedSpy = jest.fn();

  const wrapper = mount(
    <CodeQueryBar
      repositorySearch={noOp}
      saveSearchOptions={noOp}
      repoSearchResults={[]}
      searchLoading={false}
      searchOptions={{ repoScope: [], defaultRepoScopeOn: false }}
      query="testQuery"
      appName="testAppName"
      suggestionProviders={suggestionsProviderSpies}
      enableSubmitWhenOptionsChanged={false}
      onSubmit={noOp}
      onSelect={noOp}
      onSearchScopeChanged={onSearchScopeChangedSpy}
      searchScope={SearchScope.DEFAULT}
      defaultRepoOptions={[]}
    />
  );

  wrapper
    .find('ScopeSelector')
    .find('button')
    .simulate('click');
  wrapper
    .find('ScopeSelector')
    .find('EuiContextMenuItem')
    .at(1)
    .simulate('click');
  await wait(200); // wait for getSuggestions' debounce

  expect(onSearchScopeChangedSpy).toHaveBeenCalledWith(AutocompleteSuggestionType.SYMBOL);
  expect(symbolSuggestionsSpy).toHaveBeenCalledWith('testQuery', SearchScope.DEFAULT, []);
});
