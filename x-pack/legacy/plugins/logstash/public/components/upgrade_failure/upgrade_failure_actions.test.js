/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import { UpgradeFailureActions } from './upgrade_failure_actions';

describe('UpgradeFailureActions component', () => {
  let props;
  let onClose;
  let onRetry;

  beforeEach(() => {
    onClose = jest.fn();
    onRetry = jest.fn();
    props = {
      onClose,
      onRetry,
      upgradeButtonText: 'upgrade button text',
    };
  });

  it('renders component as expected', () => {
    const wrapper = shallowWithIntl(<UpgradeFailureActions {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('calls onRetry on update click', () => {
    const wrapper = mountWithIntl(<UpgradeFailureActions {...props} />);
    wrapper.find('EuiButton').simulate('click');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on "Go back" click', () => {
    const wrapper = mountWithIntl(<UpgradeFailureActions {...props} />);
    wrapper.find('EuiButtonEmpty').simulate('click');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
