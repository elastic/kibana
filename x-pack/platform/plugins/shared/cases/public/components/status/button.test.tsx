/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CaseStatuses } from '../../../common/types/domain';
import { StatusActionButton } from './button';
import { TestProviders } from '../../common/mock';
import * as i18n from '../all_cases/translations';

describe('StatusActionButton', () => {
  const onStatusChanged = jest.fn();
  const defaultProps = {
    status: CaseStatuses.open,
    totalAlerts: 0,
    syncAlertsEnabled: true,
    disabled: false,
    isLoading: false,
    onStatusChanged,
  };
  const mountComponent = (props = defaultProps) =>
    mount(
      <TestProviders>
        <StatusActionButton {...props} />
      </TestProviders>
    );

  it('it renders', async () => {
    const wrapper = mountComponent();

    expect(wrapper.find(`[data-test-subj="case-view-status-action-button"]`).exists()).toBeTruthy();
  });

  describe('Button icons', () => {
    it('it renders the correct button icon: status open', () => {
      const wrapper = mountComponent();

      expect(
        wrapper.find(`[data-test-subj="case-view-status-action-button"]`).first().prop('iconType')
      ).toBe('folderExclamation');
    });

    it('it renders the correct button icon: status in-progress', () => {
      const wrapper = mountComponent({ ...defaultProps, status: CaseStatuses['in-progress'] });

      expect(
        wrapper.find(`[data-test-subj="case-view-status-action-button"]`).first().prop('iconType')
      ).toBe('folderCheck');
    });

    it('it renders the correct button icon: status closed', () => {
      const wrapper = mountComponent({ ...defaultProps, status: CaseStatuses.closed });

      expect(
        wrapper.find(`[data-test-subj="case-view-status-action-button"]`).first().prop('iconType')
      ).toBe('folderOpen');
    });
  });

  describe('Status rotation', () => {
    it('rotates correctly to in-progress when status is open', () => {
      const wrapper = mountComponent();

      wrapper
        .find(`button[data-test-subj="case-view-status-action-button"]`)
        .first()
        .simulate('click');
      expect(onStatusChanged).toHaveBeenCalledWith('in-progress');
    });

    it('rotates correctly to closed when status is in-progress', () => {
      const wrapper = mountComponent({
        ...defaultProps,
        status: CaseStatuses['in-progress'],
        totalAlerts: 1,
      });

      wrapper
        .find(`button[data-test-subj="case-view-status-action-button"]`)
        .first()
        .simulate('click');
      wrapper
        .find('button')
        .filterWhere((node) => node.text() === i18n.CLOSE_CASE_MODAL_CONFIRM)
        .simulate('click');
      expect(onStatusChanged).toHaveBeenLastCalledWith('closed', undefined);
    });

    it('rotates correctly to open when status is closed', () => {
      const wrapper = mountComponent({ ...defaultProps, status: CaseStatuses.closed });

      wrapper
        .find(`button[data-test-subj="case-view-status-action-button"]`)
        .first()
        .simulate('click');
      expect(onStatusChanged).toHaveBeenCalledWith('open');
    });
  });
});
