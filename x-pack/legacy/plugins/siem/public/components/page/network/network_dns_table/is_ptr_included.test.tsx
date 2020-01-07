/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { FlowDirection } from '../../../../graphql/types';

import { IsPtrIncluded } from './is_ptr_included';

describe('NetworkTopNFlow Select direction', () => {
  const mockOnChange = jest.fn();

  describe('rendering', () => {
    test('it renders the basic switch to include PTR in table', () => {
      const wrapper = shallow(<IsPtrIncluded isPtrIncluded={true} onChange={mockOnChange} />);

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('Functionality work as expected', () => {
    test('when you click on bi-directional, you trigger onChange function', () => {
      const event = {
        target: { name: 'switch-ptr-included', value: FlowDirection.biDirectional },
      };
      const wrapper = mount(<IsPtrIncluded isPtrIncluded={false} onChange={mockOnChange} />);

      wrapper
        .find('button')
        .first()
        .simulate('click', event);

      wrapper.update();

      expect(mockOnChange).toHaveBeenCalled();
    });
  });
});
