import React from 'react';
import { mount } from 'enzyme';
import sinon from 'sinon';

import {
  basicRenderTest,
  basicHtmlAttributesRenderTest
} from '../../test/common_tests';

import {
  KuiToolBarSearchBox,
} from './tool_bar_search_box';

describe('KuiToolBarSearchBox', () => {
  const onFilter = sinon.spy();
  const props = { onFilter };
  test('is rendered', () => basicRenderTest(KuiToolBarSearchBox, props));
  test('HTML attributes are rendered', () => basicHtmlAttributesRenderTest(KuiToolBarSearchBox, props));

  describe('onFilter', () => {
    const searchBox = mount(<KuiToolBarSearchBox onFilter={onFilter}/>);
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

