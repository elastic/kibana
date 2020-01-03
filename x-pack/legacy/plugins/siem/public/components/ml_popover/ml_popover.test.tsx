/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { MlPopover } from './ml_popover';

jest.mock('ui/new_platform');
jest.mock('../../lib/kibana');

jest.mock('../ml/permissions/has_ml_admin_permissions', () => ({
  hasMlAdminPermissions: () => true,
}));

describe('MlPopover', () => {
  test('shows upgrade popover on mouse click', () => {
    const wrapper = mountWithIntl(<MlPopover />);

    // TODO: Update to use act() https://fb.me/react-wrap-tests-with-act
    wrapper
      .find('[data-test-subj="integrations-button"]')
      .first()
      .simulate('click');
    wrapper.update();
    expect(wrapper.find('[data-test-subj="ml-popover-upgrade-contents"]').exists()).toEqual(true);
  });
});
