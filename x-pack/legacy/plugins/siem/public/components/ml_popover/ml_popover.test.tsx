/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';
import { MlPopover } from './ml_popover';

jest.mock('../../lib/settings/use_kibana_ui_setting');

jest.mock('../ml/permissions/has_ml_admin_permissions', () => ({
  hasMlAdminPermissions: () => true,
}));

describe('MlPopover', () => {
  test('shows upgrade popover on mouse click', () => {
    const wrapper = mount(<MlPopover />);

    // TODO: Update to use act() https://fb.me/react-wrap-tests-with-act
    wrapper
      .find('[data-test-subj="integrations-button"]')
      .first()
      .simulate('click');
    wrapper.update();
    expect(wrapper.find('[data-test-subj="ml-popover-upgrade-contents"]').exists()).toEqual(true);
  });
});
