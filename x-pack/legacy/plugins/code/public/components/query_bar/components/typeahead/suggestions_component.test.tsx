/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import props from '../__fixtures__/props.json';
import { SuggestionsComponent } from './suggestions_component';

jest.mock('ui/kfetch');

test('render empty suggestions component', () => {
  const emptyFn = () => {
    return;
  };
  const suggestionItem = mount(
    <SuggestionsComponent
      query="string"
      show={true}
      suggestionGroups={[]}
      groupIndex={0}
      itemIndex={0}
      onClick={emptyFn}
      onMouseEnter={emptyFn}
      loadMore={emptyFn}
    />
  );
  expect(toJson(suggestionItem)).toMatchSnapshot();
});

test('render full suggestions component', () => {
  const emptyFn = () => {
    return;
  };
  const suggestionItem = mount(
    <MemoryRouter initialEntries={[{ pathname: '/', key: 'testKey' }]}>
      <SuggestionsComponent
        query="string"
        show={true}
        suggestionGroups={[props.symbol, props.file, props.repository]}
        groupIndex={0}
        itemIndex={0}
        onClick={emptyFn}
        onMouseEnter={emptyFn}
        loadMore={emptyFn}
      />
    </MemoryRouter>
  );
  expect(toJson(suggestionItem)).toMatchSnapshot();
});
