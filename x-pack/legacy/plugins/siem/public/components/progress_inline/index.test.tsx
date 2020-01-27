/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import '../../mock/ui_settings';
import { ProgressInline } from './index';

jest.mock('../../lib/settings/use_kibana_ui_setting');

describe('ProgressInline', () => {
  test('it renders', () => {
    const wrapper = shallow(
      <ProgressInline current={50} max={100} unit="tests">
        {'Test progress'}
      </ProgressInline>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
