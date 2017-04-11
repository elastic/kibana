import React from 'react';
import { render, mount } from 'enzyme';
import sinon from 'sinon';
import { commonHtmlProps } from '../../test/common_html_props';

import {
  KuiToolBarSearchBox,
} from './tool_bar_search_box';

const onFilter = sinon.spy();

test('renders KuiToolBarSearchBox', () => {
  const component = <KuiToolBarSearchBox onFilter={onFilter} { ...commonHtmlProps } />;
  expect(render(component)).toMatchSnapshot();
});

describe('onFilter', () => {
  test('is called on change event, with the value entered', () => {
    const searchBox = mount(<KuiToolBarSearchBox onFilter={onFilter} { ...commonHtmlProps } />);
    onFilter.reset();
    const event = { target: { value: 'a' } };
    searchBox.find('input').simulate('change', event);
    sinon.assert.calledWith(onFilter, 'a');
  });
});

describe('filter', () => {
  test('initializes search box value', () => {
    const component = <KuiToolBarSearchBox onFilter={onFilter} filter="My Query" />;
    expect(render(component)).toMatchSnapshot();
  });
});

