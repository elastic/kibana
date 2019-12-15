/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import '../../../mock/ui_settings';
import { TestProviders } from '../../../mock';
import { UtilityBarGroup, UtilityBarSection, UtilityBarText } from './index';

jest.mock('../../../lib/settings/use_kibana_ui_setting');

describe('UtilityBarSection', () => {
  test('it renders', () => {
    const wrapper = shallow(
      <TestProviders>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText>{'Test text'}</UtilityBarText>
          </UtilityBarGroup>
        </UtilityBarSection>
      </TestProviders>
    );

    expect(toJson(wrapper.find('UtilityBarSection'))).toMatchSnapshot();
  });
});
