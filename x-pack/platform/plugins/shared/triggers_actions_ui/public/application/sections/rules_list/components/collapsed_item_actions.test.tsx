/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as React from 'react';
import moment from 'moment';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { CollapsedItemActions } from './collapsed_item_actions';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import type { RuleTableItem, RuleTypeModel } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
jest.mock('../../../../common/lib/kibana');

const onRuleChanged = jest.fn();
const onEditRule = jest.fn();
const onDeleteRule = jest.fn();
const bulkDisableRules = jest.fn();
const bulkEnableRules = jest.fn();
const onUpdateAPIKey = jest.fn();
const snoozeRule = jest.fn();
const unsnoozeRule = jest.fn();
const onLoading = jest.fn();
const onRunRule = jest.fn();
const onCloneRule = jest.fn();

describe('CollapsedItemActions', () => {
  async function setup(editable: boolean = true) {
    const ruleTypeRegistry = ruleTypeRegistryMock.create();
    ruleTypeRegistry.has.mockReturnValue(true);
    const ruleTypeR: RuleTypeModel = {
      id: 'my-rule-type',
      iconClass: 'test',
      description: 'Rule when testing',
      documentationUrl: 'https://localhost.local/docs',
      validate: () => {
        return { errors: {} };
      },
      ruleParamsExpression: jest.fn(),
      requiresAppContext: !editable,
    };
    ruleTypeRegistry.get.mockReturnValue(ruleTypeR);
    const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
  }

  const getPropsWithRule = (overrides = {}, editable = false) => {
    const rule: RuleTableItem = {
      id: '1',
      enabled: true,
      name: 'test rule',
      tags: ['tag1'],
      ruleTypeId: 'test_rule_type',
      consumer: 'rules',
      schedule: { interval: '5d' },
      actions: [
        {
          id: 'test',
          actionTypeId: 'the_connector',
          group: 'rule',
          params: { message: 'test' },
        },
      ],
      params: { name: 'test rule type name' },
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      apiKeyOwner: null,
      throttle: '1m',
      notifyWhen: 'onActiveAlert',
      muteAll: false,
      mutedInstanceIds: [],
      executionStatus: {
        status: 'active',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      },
      actionsCount: 1,
      index: 0,
      ruleType: 'Test Rule Type',
      isInternallyManaged: false,
      isEditable: true,
      enabledInLicense: true,
      revision: 0,
      ...overrides,
    };

    return {
      item: rule,
      onRuleChanged,
      onEditRule,
      onDeleteRule,
      bulkDisableRules,
      bulkEnableRules,
      onUpdateAPIKey,
      snoozeRule,
      unsnoozeRule,
      onLoading,
      onRunRule,
      onCloneRule,
    };
  };

  describe('when the rule is internally managed', () => {
    beforeAll(async () => {
      await setup(true);
    });

    test('render update key action as only item', async () => {
      render(
        <CollapsedItemActions
          {...getPropsWithRule({
            isInternallyManaged: true,
            name: 'internally managed rule',
          })}
        />
      );

      await userEvent.click(screen.getByTestId('selectActionButton'));

      expect(await screen.findByTestId('updateApiKeyInternallyManaged')).toBeInTheDocument();
      expect(screen.getByTestId('disableButtonInternallyManaged')).toBeInTheDocument();
      expect(screen.queryByTestId('snoozeButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('disableButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('editRule')).not.toBeInTheDocument();
      expect(screen.queryByTestId('deleteRule')).not.toBeInTheDocument();
      expect(screen.queryByTestId('runRule')).not.toBeInTheDocument();
      expect(screen.queryByTestId('cloneRule')).not.toBeInTheDocument();
    });
  });

  describe('Lifecycle alerts', () => {
    beforeAll(async () => {
      await setup();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('shows untrack active alerts modal if `autoRecoverAlerts` is `true`', async () => {
      render(<CollapsedItemActions {...getPropsWithRule({ autoRecoverAlerts: true })} />);

      expect(await screen.findByTestId('selectActionButton')).toBeInTheDocument();
      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();
      expect(screen.getByTestId('collapsedActionPanel')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('disableButton'));
      expect(await screen.findByTestId('untrackAlertsModal')).toBeInTheDocument();
      expect(bulkDisableRules).not.toHaveBeenCalled();

      await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      await waitFor(() => {
        expect(bulkDisableRules).toHaveBeenCalledWith({ ids: ['1'], untrack: false });
      });
    });

    it('shows untrack active alerts modal if `autoRecoverAlerts` is `undefined`', async () => {
      render(<CollapsedItemActions {...getPropsWithRule({ autoRecoverAlerts: undefined })} />);

      expect(await screen.findByTestId('selectActionButton')).toBeInTheDocument();
      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();
      expect(screen.getByTestId('collapsedActionPanel')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('disableButton'));
      expect(await screen.findByTestId('untrackAlertsModal')).toBeInTheDocument();
      expect(bulkDisableRules).not.toHaveBeenCalled();

      await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      await waitFor(() => {
        expect(bulkDisableRules).toHaveBeenCalledWith({ ids: ['1'], untrack: false });
      });
    });

    it('does not show untrack active alerts modal if `autoRecoverAlerts` is `false`', async () => {
      render(<CollapsedItemActions {...getPropsWithRule({ autoRecoverAlerts: false })} />);

      expect(await screen.findByTestId('selectActionButton')).toBeInTheDocument();
      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();
      expect(screen.getByTestId('collapsedActionPanel')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('disableButton'));
      expect(screen.queryByTestId('untrackAlertsModal')).not.toBeInTheDocument();
      await waitFor(() => {
        expect(bulkDisableRules).toHaveBeenCalledWith({ ids: ['1'], untrack: false });
      });
    });
  });

  describe('with app context', () => {
    beforeAll(async () => {
      await setup(false);
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    test('renders actions correctly when rule type is not editable in this context', async () => {
      render(<CollapsedItemActions {...getPropsWithRule()} />);

      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();

      const disableBtn = screen.getByTestId('disableButton');
      expect(disableBtn).not.toBeDisabled();
      expect(disableBtn).toHaveTextContent('Disable');

      const editBtn = screen.getByTestId('editRule');
      expect(editBtn).toBeDisabled();
      expect(editBtn).toHaveTextContent('Edit rule');

      const deleteBtn = screen.getByTestId('deleteRule');
      expect(deleteBtn).not.toBeDisabled();
      expect(deleteBtn).toHaveTextContent('Delete rule');
    });
  });

  describe('without app context', () => {
    beforeAll(async () => {
      await setup();
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('does not render panel items when rule is not editable', async () => {
      render(<CollapsedItemActions {...getPropsWithRule({ isEditable: false })} />);

      expect(screen.queryByTestId('selectActionButton')).not.toBeInTheDocument();
    });

    test('renders closed popover initially and opens on click with all actions enabled', async () => {
      render(<CollapsedItemActions {...getPropsWithRule()} />);

      expect(screen.getByTestId('selectActionButton')).toBeInTheDocument();
      expect(screen.queryByTestId('collapsedActionPanel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('snoozeButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('disableButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('editRule')).not.toBeInTheDocument();
      expect(screen.queryByTestId('deleteRule')).not.toBeInTheDocument();
      expect(screen.queryByTestId('updateApiKey')).not.toBeInTheDocument();
      expect(screen.queryByTestId('runRule')).not.toBeInTheDocument();
      expect(screen.queryByTestId('cloneRule')).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();

      expect(screen.getByTestId('collapsedActionPanel')).toBeInTheDocument();
      expect(screen.getByTestId('snoozeButton')).toBeInTheDocument();
      expect(screen.getByTestId('disableButton')).toBeInTheDocument();
      expect(screen.getByTestId('editRule')).toBeInTheDocument();
      expect(screen.getByTestId('deleteRule')).toBeInTheDocument();
      expect(screen.getByTestId('updateApiKey')).toBeInTheDocument();
      expect(screen.getByTestId('runRule')).toBeInTheDocument();
      expect(screen.getByTestId('cloneRule')).toBeInTheDocument();

      expect(screen.getByTestId('selectActionButton')).not.toBeDisabled();

      const disableBtn = screen.getByTestId('disableButton');
      expect(disableBtn).not.toBeDisabled();
      expect(disableBtn).toHaveTextContent('Disable');

      const snoozeBtn = screen.getByTestId('snoozeButton');
      expect(snoozeBtn).toHaveTextContent('Snooze');

      const editBtn = screen.getByTestId('editRule');
      expect(editBtn).not.toBeDisabled();
      expect(editBtn).toHaveTextContent('Edit rule');

      const deleteBtn = screen.getByTestId('deleteRule');
      expect(deleteBtn).not.toBeDisabled();
      expect(deleteBtn).toHaveTextContent('Delete rule');

      expect(screen.getByTestId('updateApiKey')).toHaveTextContent('Update API key');
      expect(screen.getByTestId('runRule')).toHaveTextContent('Run rule');
      expect(screen.getByTestId('cloneRule')).toHaveTextContent('Clone rule');
    });

    test('handles case when run rule is clicked', async () => {
      render(<CollapsedItemActions {...getPropsWithRule()} />);

      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();

      await userEvent.click(screen.getByTestId('runRule'));
      expect(onRunRule).toHaveBeenCalled();
    });

    test('handles case when rule is unmuted and enabled and disable is clicked', async () => {
      render(<CollapsedItemActions {...getPropsWithRule()} />);

      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();

      await userEvent.click(screen.getByTestId('disableButton'));

      expect(screen.getByTestId('untrackAlertsModal')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(bulkDisableRules).toHaveBeenCalledWith({
          ids: ['1'],
          untrack: false,
        });
      });
    });

    test('handles case when rule is unmuted and disabled and enable is clicked', async () => {
      render(<CollapsedItemActions {...getPropsWithRule({ enabled: false })} />);

      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();

      await userEvent.click(screen.getByTestId('disableButton'));

      await waitFor(() => {
        expect(bulkEnableRules).toHaveBeenCalled();
      });
    });

    test('handles case when edit rule is clicked', async () => {
      render(<CollapsedItemActions {...getPropsWithRule()} />);

      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();

      await userEvent.click(screen.getByTestId('editRule'));
      expect(onEditRule).toHaveBeenCalled();
    });

    test('handles case when delete rule is clicked', async () => {
      render(<CollapsedItemActions {...getPropsWithRule()} />);

      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();

      await userEvent.click(screen.getByTestId('deleteRule'));
      expect(onDeleteRule).toHaveBeenCalled();
    });

    test('renders actions correctly when rule is disabled', async () => {
      render(<CollapsedItemActions {...getPropsWithRule({ enabled: false })} />);

      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();

      expect(screen.queryByTestId('snoozeButton')).not.toBeInTheDocument();

      const disableBtn = screen.getByTestId('disableButton');
      expect(disableBtn).not.toBeDisabled();
      expect(disableBtn).toHaveTextContent('Enable');

      const editBtn = screen.getByTestId('editRule');
      expect(editBtn).not.toBeDisabled();
      expect(editBtn).toHaveTextContent('Edit rule');

      const deleteBtn = screen.getByTestId('deleteRule');
      expect(deleteBtn).not.toBeDisabled();
      expect(deleteBtn).toHaveTextContent('Delete rule');
    });

    test('renders actions correctly when rule is not enabled due to license', async () => {
      render(<CollapsedItemActions {...getPropsWithRule({ enabledInLicense: false })} />);

      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();

      expect(screen.getByTestId('snoozeButton')).toBeDisabled();

      const disableBtn = screen.getByTestId('disableButton');
      expect(disableBtn).toBeDisabled();
      expect(disableBtn).toHaveTextContent('Disable');

      const editBtn = screen.getByTestId('editRule');
      expect(editBtn).not.toBeDisabled();
      expect(editBtn).toHaveTextContent('Edit rule');

      const deleteBtn = screen.getByTestId('deleteRule');
      expect(deleteBtn).not.toBeDisabled();
      expect(deleteBtn).toHaveTextContent('Delete rule');
    });

    test('renders actions correctly when rule is muted', async () => {
      render(<CollapsedItemActions {...getPropsWithRule({ muteAll: true })} />);

      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();

      expect(screen.getByTestId('snoozeButton')).toHaveTextContent('Snoozed indefinitely');

      const disableBtn = screen.getByTestId('disableButton');
      expect(disableBtn).not.toBeDisabled();
      expect(disableBtn).toHaveTextContent('Disable');

      const editBtn = screen.getByTestId('editRule');
      expect(editBtn).not.toBeDisabled();
      expect(editBtn).toHaveTextContent('Edit rule');

      const deleteBtn = screen.getByTestId('deleteRule');
      expect(deleteBtn).not.toBeDisabled();
      expect(deleteBtn).toHaveTextContent('Delete rule');
    });

    test('renders snooze text correctly if the rule is snoozed', async () => {
      // Use a far-future date so real timers work with waitForEuiPopoverOpen
      render(
        <CollapsedItemActions
          {...getPropsWithRule({ isSnoozedUntil: moment('2099-02-01').format() })}
        />
      );

      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();

      expect(screen.getByTestId('snoozeButton')).toHaveTextContent('Snoozed until Feb 1');
    });

    test('snooze is disabled for SIEM rules', async () => {
      render(
        <CollapsedItemActions
          {...getPropsWithRule({
            consumer: 'siem',
          })}
        />
      );

      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();

      expect(screen.queryByTestId('snoozeButton')).not.toBeInTheDocument();
    });

    test('clone rule is disabled for SIEM rules', async () => {
      render(
        <CollapsedItemActions
          {...getPropsWithRule({
            consumer: 'siem',
          })}
        />
      );

      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();

      expect(screen.getByTestId('cloneRule')).toBeDisabled();
    });

    test('handles case when clone rule is clicked', async () => {
      render(<CollapsedItemActions {...getPropsWithRule()} />);

      await userEvent.click(screen.getByTestId('selectActionButton'));
      await waitForEuiPopoverOpen();

      await userEvent.click(screen.getByTestId('cloneRule'));
      expect(onCloneRule).toHaveBeenCalled();
    });
  });
});
