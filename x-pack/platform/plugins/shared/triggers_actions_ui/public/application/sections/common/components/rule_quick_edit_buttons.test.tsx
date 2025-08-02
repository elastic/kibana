/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { RuleQuickEditButtonsWithApi as RuleQuickEditButtons } from './rule_quick_edit_buttons';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleTableItem } from '../../../../types';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      notifications: { toast: { addDanger: jest.fn() } },
    },
  }),
}));

const updateRulesToBulkEdit = jest.fn();
const onDisable = jest.fn();

describe('rule_quick_edit_buttons', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Lifecycle alerts', () => {
    const renderComponent = ({ autoRecoverAlerts }: { autoRecoverAlerts?: boolean }) => {
      const mockRule: RuleTableItem = {
        id: '1',
        enabled: true,
        enabledInLicense: true,
        autoRecoverAlerts,
      } as RuleTableItem;

      return render(
        <IntlProvider locale="en">
          <RuleQuickEditButtons
            isAllSelected={false}
            getFilter={() => null}
            selectedItems={[mockRule]}
            onPerformingAction={() => {}}
            onActionPerformed={() => {}}
            onEnable={async () => {}}
            onDisable={onDisable}
            updateRulesToBulkEdit={() => {}}
          />
        </IntlProvider>
      );
    };

    it('shows untrack active alerts modal if `autoRecoverAlerts` is `true`', async () => {
      renderComponent({ autoRecoverAlerts: true });

      await userEvent.click(await screen.getByTestId('bulkDisable'));

      await waitFor(async () => {
        expect(await screen.queryByTestId('untrackAlertsModal')).toBeInTheDocument();
        expect(onDisable).not.toHaveBeenCalled();
      });

      await userEvent.click(await screen.getByTestId('confirmModalConfirmButton'));
      await waitFor(async () => {
        expect(onDisable).toHaveBeenCalledTimes(1);
        expect(onDisable).toHaveBeenCalledWith(false);
      });
    });

    it('shows untrack active alerts modal if `autoRecoverAlerts` is `undefined`', async () => {
      renderComponent({ autoRecoverAlerts: undefined });

      await userEvent.click(await screen.getByTestId('bulkDisable'));

      await waitFor(async () => {
        expect(await screen.queryByTestId('untrackAlertsModal')).toBeInTheDocument();
        expect(onDisable).not.toHaveBeenCalled();
      });

      await userEvent.click(await screen.getByTestId('confirmModalConfirmButton'));
      await waitFor(async () => {
        expect(onDisable).toHaveBeenCalledTimes(1);
        expect(onDisable).toHaveBeenCalledWith(false);
      });
    });

    it('does not show untrack active alerts modal if `autoRecoverAlerts` is `false`', async () => {
      renderComponent({ autoRecoverAlerts: false });

      await userEvent.click(await screen.getByTestId('bulkDisable'));

      await waitFor(async () => {
        expect(await screen.queryByTestId('untrackAlertsModal')).not.toBeInTheDocument();
        expect(onDisable).toHaveBeenCalledWith(false);
      });
    });
  });

  it('renders buttons', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: true,
    } as RuleTableItem;

    const wrapper = mountWithIntl(
      <RuleQuickEditButtons
        isAllSelected={false}
        getFilter={() => null}
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        onEnable={async () => {}}
        onDisable={async () => {}}
        updateRulesToBulkEdit={() => {}}
      />
    );

    expect(wrapper.find('[data-test-subj="bulkEnable"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkDisable"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="updateAPIKeys"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkDelete"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkSnooze"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkUnsnooze"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkSnoozeSchedule"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkRemoveSnoozeSchedule"]').exists()).toBeTruthy();
  });

  it('renders enableAll if rules are all disabled', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: false,
    } as RuleTableItem;

    const wrapper = mountWithIntl(
      <RuleQuickEditButtons
        isAllSelected={false}
        getFilter={() => null}
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        onEnable={async () => {}}
        onDisable={async () => {}}
        updateRulesToBulkEdit={() => {}}
      />
    );

    expect(wrapper.find('[data-test-subj="bulkEnable"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bulkDisable"]').exists()).toBeTruthy();
  });

  it('removes the snooze bulk actions if in select all mode', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: true,
    } as RuleTableItem;

    const wrapper = mountWithIntl(
      <RuleQuickEditButtons
        isAllSelected={true}
        getFilter={() => null}
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        onEnable={async () => {}}
        onDisable={async () => {}}
        updateRulesToBulkEdit={() => {}}
      />
    );

    expect(wrapper.find('[data-test-subj="bulkEnable"]').first().prop('isDisabled')).toBeFalsy();
    expect(wrapper.find('[data-test-subj="bulkDelete"]').first().prop('isDisabled')).toBeFalsy();
    expect(wrapper.find('[data-test-subj="updateAPIKeys"]').first().prop('isDisabled')).toBeFalsy();
    expect(wrapper.find('[data-test-subj="bulkSnooze"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="bulkUnsnooze"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="bulkSnoozeSchedule"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="bulkRemoveSnoozeSchedule"]').exists()).toBeFalsy();
  });

  it('properly sets rules or filters to delete when not selecting all', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: true,
      enabledInLicense: true,
    } as RuleTableItem;

    const wrapper = mountWithIntl(
      <RuleQuickEditButtons
        isAllSelected={false}
        getFilter={() => null}
        selectedItems={[mockRule]}
        onPerformingAction={() => {}}
        onActionPerformed={() => {}}
        onEnable={async () => {}}
        onDisable={async () => {}}
        updateRulesToBulkEdit={updateRulesToBulkEdit}
      />
    );

    wrapper.find('[data-test-subj="bulkSnooze"]').first().simulate('click');
    expect(updateRulesToBulkEdit).toHaveBeenCalledTimes(1);
  });
});
