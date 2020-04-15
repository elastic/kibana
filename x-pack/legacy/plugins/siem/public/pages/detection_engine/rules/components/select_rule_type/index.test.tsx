/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { SelectRuleType } from './index';
import { useFormFieldMock } from '../../../../../mock';
jest.mock('../../../../../lib/kibana');

describe('SelectRuleType', () => {
  it('renders correctly', () => {
    const Component = () => {
      const field = useFormFieldMock();

      return <SelectRuleType field={field} />;
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('[data-test-subj="selectRuleType"]')).toHaveLength(1);
  });
});
