/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../mock/match_media';
import { HeaderGlobal } from './index';

jest.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: '/app/siem#/hosts/allHosts',
    hash: '',
    search: '',
    state: '',
  }),
  withRouter: () => jest.fn(),
}));

jest.mock('ui/new_platform');

describe('HeaderGlobal', () => {
  test('it renders', () => {
    const wrapper = shallow(<HeaderGlobal />);

    expect(wrapper.find('[className="siemHeaderGlobal"]')).toHaveLength(1);
  });
});
