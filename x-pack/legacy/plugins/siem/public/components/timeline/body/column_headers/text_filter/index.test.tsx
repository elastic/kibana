/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { DEFAULT_PLACEHOLDER, TextFilter } from '.';

describe('TextFilter', () => {
  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(<TextFilter columnId="foo" minWidth={100} />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    describe('placeholder', () => {
      test('it renders the default placeholder when no filter is specified, and a placeholder is NOT provided', () => {
        const wrapper = mount(<TextFilter columnId="foo" minWidth={100} />);

        expect(wrapper.find(`input[placeholder="${DEFAULT_PLACEHOLDER}"]`).exists()).toEqual(true);
      });

      test('it renders the default placeholder when no filter is specified, a placeholder is provided', () => {
        const placeholder = 'Make a jazz noise here';
        const wrapper = mount(
          <TextFilter columnId="foo" placeholder={placeholder} minWidth={100} />
        );

        expect(wrapper.find(`input[placeholder="${placeholder}"]`).exists()).toEqual(true);
      });
    });

    describe('minWidth', () => {
      test('it applies the value of the minwidth prop to the input', () => {
        const minWidth = 150;
        const wrapper = mount(<TextFilter columnId="foo" minWidth={minWidth} />);

        expect(wrapper.find('input').props()).toHaveProperty('minwidth', `${minWidth}px`);
      });
    });

    describe('value', () => {
      test('it renders the value of the filter prop', () => {
        const filter = 'out the noise';
        const wrapper = mount(<TextFilter columnId="foo" filter={filter} minWidth={100} />);

        expect(wrapper.find('input').prop('value')).toEqual(filter);
      });
    });

    describe('#onFilterChange', () => {
      test('it invokes the onFilterChange callback when the input is updated', () => {
        const columnId = 'foo';
        const oldFilter = 'abcdef';
        const newFilter = `${oldFilter}g`;
        const onFilterChange = jest.fn();

        const wrapper = mount(
          <TextFilter
            columnId={columnId}
            filter={oldFilter}
            minWidth={100}
            onFilterChange={onFilterChange}
          />
        );

        wrapper.find('input').simulate('change', { target: { value: newFilter } });
        expect(onFilterChange).toBeCalledWith({
          columnId,
          filter: newFilter,
        });
      });
    });
  });
});
