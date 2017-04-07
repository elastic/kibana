import React from 'react';
import { render, mount } from 'enzyme';
import sinon from 'sinon';
import { commonHtmlProps } from '../../test/common_html_props';

import {
  KuiToolBarSearchBox,
} from './tool_bar_search_box';

describe('KuiToolBarSearchBox', () => {
  const onFilter = sinon.spy();

  test('renders KuiToolBarSearchBox', () => {
    const component = <KuiToolBarSearchBox onFilter={onFilter} { ...commonHtmlProps } />;
    expect(render(component)).toMatchSnapshot();
  });

  describe('onFilter', () => {
    const searchBox = mount(<KuiToolBarSearchBox onFilter={onFilter} { ...commonHtmlProps } />);
    onFilter.reset();

    test('is called on change event', () => {
      const event = { target: { value: 'a' } };
      searchBox.find('input').simulate('change', event);
      sinon.assert.calledOnce(onFilter);
    });

    test('is called with the value entered', () => {
      sinon.assert.calledWith(onFilter, 'a');
    });
  });

  describe('filter prop', () => {
    test('initializes search box value', () => {
      const searchBox = mount(<KuiToolBarSearchBox onFilter={onFilter} filter="My Query"/>);
      expect(searchBox.find('input').props().defaultValue).toBe('My Query');
    });
  });
});

