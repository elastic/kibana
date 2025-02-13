/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CaseStatuses } from '../../../common/types/domain';
import { StatusContextMenu } from './status_context_menu';
import { TestProviders } from '../../common/mock';
import { useShouldDisableStatus } from '../actions/status/use_should_disable_status';

jest.mock('../actions/status/use_should_disable_status');

describe('StatusContextMenu', () => {
  const onStatusChanged = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useShouldDisableStatus as jest.Mock).mockReturnValue(() => false);
  });

  it('renders', async () => {
    const wrapper = mount(
      <TestProviders>
        <StatusContextMenu currentStatus={CaseStatuses.open} onStatusChanged={onStatusChanged} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="case-view-status-dropdown"]`).exists()).toBeTruthy();
  });

  it('renders a simple status badge when disabled', async () => {
    const wrapper = mount(
      <TestProviders>
        <StatusContextMenu
          disabled={true}
          currentStatus={CaseStatuses.open}
          onStatusChanged={onStatusChanged}
        />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="case-view-status-dropdown"]`).exists()).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="case-status-badge-open"]`).exists()).toBeTruthy();
  });

  it('renders the current status correctly', async () => {
    const wrapper = mount(
      <TestProviders>
        <StatusContextMenu currentStatus={CaseStatuses.closed} onStatusChanged={onStatusChanged} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="case-view-status-dropdown"]`).first().text()).toBe(
      'Closed'
    );
  });

  it('changes the status', async () => {
    const wrapper = mount(
      <TestProviders>
        <StatusContextMenu currentStatus={CaseStatuses.open} onStatusChanged={onStatusChanged} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="case-view-status-dropdown"] button`).simulate('click');
    wrapper
      .find(`[data-test-subj="case-view-status-dropdown-in-progress"] button`)
      .simulate('click');

    expect(onStatusChanged).toHaveBeenCalledWith('in-progress');
  });

  it('does not render the button at all if the status cannot change', async () => {
    (useShouldDisableStatus as jest.Mock).mockReturnValue(() => true);
    const wrapper = mount(
      <TestProviders>
        <StatusContextMenu currentStatus={CaseStatuses.open} onStatusChanged={onStatusChanged} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="case-view-status-dropdown"] button`).simulate('click');
    expect(wrapper.find(`[data-test-subj="case-view-status-dropdown-open"] button`)).toHaveLength(
      0
    );

    expect(onStatusChanged).not.toHaveBeenCalled();
  });

  it('updates menu items when shouldDisableStatus changes', async () => {
    const mockShouldDisableStatus = jest.fn().mockReturnValue(false);
    (useShouldDisableStatus as jest.Mock).mockReturnValue(mockShouldDisableStatus);

    const wrapper = mount(
      <TestProviders>
        <StatusContextMenu currentStatus={CaseStatuses.open} onStatusChanged={onStatusChanged} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="case-view-status-dropdown"] button`).simulate('click');

    expect(mockShouldDisableStatus).toHaveBeenCalledWith([{ status: CaseStatuses.open }]);
  });

  it('handles all statuses being disabled', async () => {
    (useShouldDisableStatus as jest.Mock).mockReturnValue(() => true);

    const wrapper = mount(
      <TestProviders>
        <StatusContextMenu currentStatus={CaseStatuses.open} onStatusChanged={onStatusChanged} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="case-view-status-dropdown"] button`).simulate('click');
    expect(wrapper.find('EuiContextMenuItem').prop('onClick')).toBeUndefined();
  });

  it('correctly evaluates each status option', async () => {
    (useShouldDisableStatus as jest.Mock).mockReturnValue(false);

    const wrapper = mount(
      <TestProviders>
        <StatusContextMenu currentStatus={CaseStatuses.open} onStatusChanged={onStatusChanged} />
      </TestProviders>
    );

    expect(
      wrapper.find(`[data-test-subj="case-view-status-dropdown"] button`).exists()
    ).toBeFalsy();
  });
});
