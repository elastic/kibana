/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CaseStatuses } from '../../../common/types/domain';
import { StatusActionButton } from './button';
import { TestProviders } from '../../common/mock';
import * as i18n from '../all_cases/translations';
import type { CaseStatusDefinition } from '../../../common/types/domain';
import { DEFAULT_CASE_STATUSES } from '../../../common/utils/statuses';
import * as customStatuses from '../../common/custom_statuses';
import * as api from '../../containers/api';

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
      expect(onStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'in-progress', category: 'active' })
      );
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
      expect(onStatusChanged).toHaveBeenLastCalledWith(
        expect.objectContaining({ key: 'closed', category: 'done' }),
        undefined
      );
    });

    it('rotates correctly to open when status is closed', () => {
      const wrapper = mountComponent({ ...defaultProps, status: CaseStatuses.closed });

      wrapper
        .find(`button[data-test-subj="case-view-status-action-button"]`)
        .first()
        .simulate('click');
      expect(onStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'open', category: 'not_started' })
      );
    });
  });

  describe('with custom statuses', () => {
    const waiting: CaseStatusDefinition = {
      key: 'waiting',
      label: 'Waiting',
      color: 'accent',
      category: 'active',
      order: 1,
      isDefault: false,
      disabled: false,
    };
    const parked: CaseStatusDefinition = { ...waiting, key: 'parked', label: 'Parked', order: 0 };

    beforeEach(() => {
      jest.spyOn(customStatuses, 'isCustomStatusesEnabled').mockReturnValue(true);
      // The disabled status comes first, so the button skips it.
      jest
        .spyOn(api, 'getCaseStatuses')
        .mockResolvedValue([
          { ...DEFAULT_CASE_STATUSES[0], order: 2 },
          { ...parked, disabled: true },
          waiting,
          { ...DEFAULT_CASE_STATUSES[1], order: 3 },
          { ...DEFAULT_CASE_STATUSES[2], order: 4 },
        ]);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('moves the case to the first enabled status of the next stage', async () => {
      render(
        <TestProviders>
          <StatusActionButton {...defaultProps} />
        </TestProviders>
      );

      expect(await screen.findByRole('button', { name: 'Mark as Waiting' })).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('case-view-status-action-button'));

      expect(onStatusChanged).toHaveBeenCalledWith(waiting);
    });
  });
});
