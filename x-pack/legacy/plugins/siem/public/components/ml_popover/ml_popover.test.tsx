/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';
import { MlPopover } from './ml_popover';

jest.mock('../ml/permissions/has_ml_admin_permissions', () => ({
  hasMlAdminPermissions: () => true,
}));

describe('MlPopover', () => {
  describe('MlPopover', () => {
    test('showing a popover on a mouse click', () => {
      const wrapper = mount(<MlPopover />);
      wrapper
        .find('[data-test-subj="integrations-button"]')
        .first()
        .simulate('click');
      wrapper.update();
      expect(wrapper.find('[data-test-subj="ml-popover-contents"]').exists()).toEqual(true);
    });
  });
});
