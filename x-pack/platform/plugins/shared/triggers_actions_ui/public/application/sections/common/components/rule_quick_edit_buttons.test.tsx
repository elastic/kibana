/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { RuleQuickEditButtonsWithApi as RuleQuickEditButtons } from './rule_quick_edit_buttons';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { RuleTableItem } from '../../../../types';

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

      await userEvent.click(screen.getByTestId('bulkDisable'));
      expect(await screen.findByTestId('untrackAlertsModal')).toBeInTheDocument();
      expect(onDisable).not.toHaveBeenCalled();

      await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      await waitFor(() => {
        expect(onDisable).toHaveBeenCalledTimes(1);
      });
      expect(onDisable).toHaveBeenCalledWith(false);
    });

    it('shows untrack active alerts modal if `autoRecoverAlerts` is `undefined`', async () => {
      renderComponent({ autoRecoverAlerts: undefined });

      await userEvent.click(screen.getByTestId('bulkDisable'));
      expect(await screen.findByTestId('untrackAlertsModal')).toBeInTheDocument();
      expect(onDisable).not.toHaveBeenCalled();

      await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      await waitFor(() => {
        expect(onDisable).toHaveBeenCalledTimes(1);
      });
      expect(onDisable).toHaveBeenCalledWith(false);
    });

    it('does not show untrack active alerts modal if `autoRecoverAlerts` is `false`', async () => {
      renderComponent({ autoRecoverAlerts: false });

      await userEvent.click(screen.getByTestId('bulkDisable'));
      expect(screen.queryByTestId('untrackAlertsModal')).not.toBeInTheDocument();
      await waitFor(() => {
        expect(onDisable).toHaveBeenCalledWith(false);
      });
    });
  });

  it('renders buttons', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: true,
    } as RuleTableItem;

    render(
      <IntlProvider locale="en">
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
      </IntlProvider>
    );

    expect(screen.getByTestId('bulkEnable')).toBeInTheDocument();
    expect(screen.getByTestId('bulkDisable')).toBeInTheDocument();
    expect(screen.getByTestId('updateAPIKeys')).toBeInTheDocument();
    expect(screen.getByTestId('bulkDelete')).toBeInTheDocument();
    expect(screen.getByTestId('bulkSnooze')).toBeInTheDocument();
    expect(screen.getByTestId('bulkUnsnooze')).toBeInTheDocument();
    expect(screen.getByTestId('bulkSnoozeSchedule')).toBeInTheDocument();
    expect(screen.getByTestId('bulkRemoveSnoozeSchedule')).toBeInTheDocument();
  });

  it('renders enableAll if rules are all disabled', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: false,
    } as RuleTableItem;

    render(
      <IntlProvider locale="en">
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
      </IntlProvider>
    );

    expect(screen.getByTestId('bulkEnable')).toBeInTheDocument();
    expect(screen.getByTestId('bulkDisable')).toBeInTheDocument();
  });

  it('removes the snooze bulk actions if in select all mode', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: true,
    } as RuleTableItem;

    render(
      <IntlProvider locale="en">
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
      </IntlProvider>
    );

    expect(screen.getByTestId('bulkEnable')).not.toBeDisabled();
    expect(screen.getByTestId('bulkDelete')).not.toBeDisabled();
    expect(screen.getByTestId('updateAPIKeys')).not.toBeDisabled();
    expect(screen.queryByTestId('bulkSnooze')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bulkUnsnooze')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bulkSnoozeSchedule')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bulkRemoveSnoozeSchedule')).not.toBeInTheDocument();
  });

  it('properly sets rules or filters to delete when not selecting all', async () => {
    const mockRule: RuleTableItem = {
      id: '1',
      enabled: true,
      enabledInLicense: true,
    } as RuleTableItem;

    render(
      <IntlProvider locale="en">
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
      </IntlProvider>
    );

    await userEvent.click(screen.getByTestId('bulkSnooze'));
    expect(updateRulesToBulkEdit).toHaveBeenCalledTimes(1);
  });
});
