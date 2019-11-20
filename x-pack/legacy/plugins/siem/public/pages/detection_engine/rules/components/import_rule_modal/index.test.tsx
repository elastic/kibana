/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { ImportRuleModal } from './index';
import { useKibanaUiSetting } from '../../../../../lib/settings/use_kibana_ui_setting';
import { getMockKibanaUiSetting } from '../../../../../mock';
import { DEFAULT_KBN_VERSION } from '../../../../../../common/constants';

const mockUseKibanaUiSetting: jest.Mock = useKibanaUiSetting as jest.Mock;
jest.mock('../../../../../lib/settings/use_kibana_ui_setting', () => ({
  useKibanaUiSetting: jest.fn(),
}));

describe('ImportRuleModal', () => {
  test('renders correctly against snapshot', () => {
    // @ts-ignore TODO: Fix hook mock
    mockUseKibanaUiSetting.mockImplementation(getMockKibanaUiSetting(DEFAULT_KBN_VERSION));
    const wrapper = shallow(
      <ImportRuleModal showModal={true} closeModal={jest.fn()} importComplete={jest.fn()} />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
