/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import { UserActionShowAlert } from './show_alert';
import { useCaseViewNavigation, useCaseViewParams } from '../../../common/navigation';

const props = {
  id: 'action-id',
  alertId: 'alert-id',
  index: 'alert-index',
  onShowAlertDetails: jest.fn(),
};

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/navigation/hooks');

const useCaseViewParamsMock = useCaseViewParams as jest.Mock;
const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;

describe('UserActionShowAlert ', () => {
  let wrapper: ReactWrapper;
  const onShowAlertDetails = jest.fn();
  const navigateToCaseView = jest.fn();

  beforeAll(() => {
    wrapper = mount(<UserActionShowAlert {...props} onShowAlertDetails={onShowAlertDetails} />);
    useCaseViewParamsMock.mockReturnValue({ detailName: 'case-id' });
    useCaseViewNavigationMock.mockReturnValue({ navigateToCaseView });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('it renders', async () => {
    expect(
      wrapper.find('[data-test-subj="comment-action-show-alert-action-id"]').first().exists()
    ).toBeTruthy();
  });

  it('it calls onShowAlertDetails onClick when is defined', async () => {
    wrapper.find('button[data-test-subj="comment-action-show-alert-action-id"]').simulate('click');
    expect(onShowAlertDetails).toHaveBeenCalledWith('alert-id', 'alert-index');
    expect(navigateToCaseView).toBeCalledTimes(0);
  });

  it('it calls navigateToCaseView onClick when onShowAlertDetails is undefined', async () => {
    wrapper = mount(<UserActionShowAlert {...{ ...props, onShowAlertDetails: undefined }} />);
    wrapper.find('button[data-test-subj="comment-action-show-alert-action-id"]').simulate('click');
    expect(navigateToCaseView).toHaveBeenCalledWith({ detailName: 'case-id', tabId: 'alerts' });
    expect(onShowAlertDetails).toBeCalledTimes(0);
  });
});
