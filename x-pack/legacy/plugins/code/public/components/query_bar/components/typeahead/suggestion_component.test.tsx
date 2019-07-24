/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';
import sinon from 'sinon';

import props from '../__fixtures__/props.json';
import { SuggestionComponent } from './suggestion_component';

test('render file item', () => {
  const emptyFn = () => {
    return;
  };
  const suggestionItem = mount(
    <SuggestionComponent
      query="bar"
      innerRef={sinon.spy()}
      selected={false}
      suggestion={props.file.suggestions[0]}
      onClick={emptyFn}
      onMouseEnter={emptyFn}
      ariaId={`suggestion-1-1`}
      key={`file-1-1`}
    />
  );
  expect(toJson(suggestionItem)).toMatchSnapshot();
});

test('render symbol item', () => {
  const emptyFn = () => {
    return;
  };
  const suggestionItem = mount(
    <SuggestionComponent
      query="string"
      innerRef={sinon.spy()}
      selected={false}
      suggestion={props.symbol.suggestions[0]}
      onClick={emptyFn}
      onMouseEnter={emptyFn}
      ariaId={`suggestion-1-1`}
      key={`symbol-1-1`}
    />
  );
  expect(toJson(suggestionItem)).toMatchSnapshot();
});

test('render repository item', () => {
  const emptyFn = () => {
    return;
  };
  const suggestionItem = mount(
    <SuggestionComponent
      query="kibana"
      innerRef={sinon.spy()}
      selected={false}
      suggestion={props.repository.suggestions[0]}
      onClick={emptyFn}
      onMouseEnter={emptyFn}
      ariaId={`suggestion-1-1`}
      key={`file-1-1`}
    />
  );
  expect(toJson(suggestionItem)).toMatchSnapshot();
});
