/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { SYMBOLIZE_AS_CIRCLE, SYMBOLIZE_AS_ICON } from '../../vector_constants';
import { VectorStyleSymbolEditor } from './vector_style_symbol_editor';

const symbolOptions = [
  { value: 'symbol1', label: 'symbol1' },
  { value: 'symbol2', label: 'symbol2' },
];

const defaultProps = {
  styleOptions: {
    symbolizeAs: SYMBOLIZE_AS_CIRCLE,
    symbolId: symbolOptions[0].value,
  },
  handlePropertyChange: () => {},
  symbolOptions,
  isDarkMode: false,
};

test('Should render symbol select when symbolized as Circle', () => {
  const component = shallow(<VectorStyleSymbolEditor {...defaultProps} />);

  expect(component).toMatchSnapshot();
});

test('Should render icon select when symbolized as Icon', () => {
  const component = shallow(
    <VectorStyleSymbolEditor
      {...defaultProps}
      styleOptions={{
        symbolizeAs: SYMBOLIZE_AS_ICON,
        symbolId: symbolOptions[0].value,
      }}
    />
  );

  expect(component).toMatchSnapshot();
});
