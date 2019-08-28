/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { SessionExpirationWarning } from './session_expiration_warning';

describe('SessionExpirationWarning', () => {
  it('fires its callback when the OK button is clicked', () => {
    const handler = jest.fn();
    const wrapper = mountWithIntl(<SessionExpirationWarning onRefreshSession={handler} />);

    expect(handler).toBeCalledTimes(0);
    wrapper.find('EuiButton[data-test-subj="refreshSessionButton"]').simulate('click');
    expect(handler).toBeCalledTimes(1);
  });
});
