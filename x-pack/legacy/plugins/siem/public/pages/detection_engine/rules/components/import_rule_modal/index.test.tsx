/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';
import { ImportRuleModalComponent } from './index';

jest.mock('../../../../../lib/kibana');

describe('ImportRuleModal', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <ImportRuleModalComponent
        closeModal={jest.fn()}
        importComplete={jest.fn()}
        showModal={true}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
