/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { ComponentOpts } from './rule_status_dropdown';
import { RuleStatusDropdown } from './rule_status_dropdown';

const NOW_STRING = '2020-03-01T00:00:00.000Z';
const SNOOZE_UNTIL = new Date('2020-03-04T00:00:00.000Z');

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: {
        toasts: {
          addSuccess: jest.fn(),
          addDanger: jest.fn(),
        },
      },
    },
  }),
}));

describe('RuleStatusDropdown', () => {
  const enableRule = jest.fn();
  const disableRule = jest.fn();
  const snoozeRule = jest.fn();
  const unsnoozeRule = jest.fn();
  const props: ComponentOpts = {
    disableRule,
    enableRule,
    snoozeRule,
    unsnoozeRule,
    isEditable: true,
    rule: {
      id: '1',
      name: 'test rule',
      tags: ['tag1'],
      enabled: true,
      ruleTypeId: 'test_rule_type',
      schedule: { interval: '5d' },
      actions: [],
      params: { name: 'test rule type name' },
      createdBy: null,
      updatedBy: null,
      apiKeyOwner: null,
      throttle: '1m',
      muteAll: false,
      mutedInstanceIds: [],
      executionStatus: {
        status: 'active',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      },
      consumer: 'test',
      actionsCount: 0,
      ruleType: 'test_rule_type',
      createdAt: new Date('2020-08-20T19:23:38Z'),
      enabledInLicense: true,
      isEditable: true,
      notifyWhen: null,
      index: 0,
      updatedAt: new Date('2020-08-20T19:23:38Z'),
      snoozeSchedule: [],
    } as ComponentOpts['rule'],
    onRuleChanged: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.spyOn(global.Date, 'now').mockImplementation(() => new Date(NOW_STRING).valueOf());
  });

  test('renders status control as enabled switch', () => {
    const wrapper = mountWithIntl(<RuleStatusDropdown {...props} />);
    const switchComponent = wrapper.find('[data-test-subj="ruleStatusDropdownSwitch"]').first();
    expect(switchComponent.props().checked).toBe(true);
  });

  test('renders status control as disabled when rule is disabled', () => {
    const wrapper = mountWithIntl(
      <RuleStatusDropdown {...{ ...props, rule: { ...props.rule, enabled: false } }} />
    );
    const switchComponent = wrapper.find('[data-test-subj="ruleStatusDropdownSwitch"]').first();
    expect(switchComponent.props().checked).toBe(false);
  });

  test('renders status control as snoozed when rule is snoozed', () => {
    jest.spyOn(global.Date, 'now').mockImplementation(() => new Date(NOW_STRING).valueOf());

    const wrapper = mountWithIntl(
      <RuleStatusDropdown
        {...{ ...props, rule: { ...props.rule, isSnoozedUntil: SNOOZE_UNTIL } }}
      />
    );
    const switchComponent = wrapper.find('[data-test-subj="ruleStatusDropdownSwitch"]').first();
    expect(switchComponent.props().checked).toBe(true);
    expect(wrapper.find('[data-test-subj="remainingSnoozeTime"]').first().text()).toBe('3 days');
  });

  test('renders status control as snoozed when rule has muteAll set to true', () => {
    jest.spyOn(global.Date, 'now').mockImplementation(() => new Date(NOW_STRING).valueOf());

    const wrapper = mountWithIntl(
      <RuleStatusDropdown {...{ ...props, rule: { ...props.rule, muteAll: true } }} />
    );
    const switchComponent = wrapper.find('[data-test-subj="ruleStatusDropdownSwitch"]').first();
    expect(switchComponent.props().checked).toBe(true);
    expect(wrapper.find('[data-test-subj="remainingSnoozeTime"]').first().text()).toBe(
      'Indefinitely'
    );
  });

  test('renders status control as disabled when rule is snoozed but also disabled', () => {
    const wrapper = mountWithIntl(
      <RuleStatusDropdown
        {...{ ...props, rule: { ...props.rule, enabled: false, isSnoozedUntil: SNOOZE_UNTIL } }}
      />
    );
    const switchComponent = wrapper.find('[data-test-subj="ruleStatusDropdownSwitch"]').first();
    expect(switchComponent.props().checked).toBe(false);
  });

  test('renders read-only status control when isEditable is false', () => {
    const wrapper = mountWithIntl(
      <RuleStatusDropdown
        {...{
          ...props,
          rule: { ...props.rule },
        }}
        isEditable={false}
      />
    );
    const readOnlySwitch = wrapper.find('[data-test-subj="statusDropdownReadonly"]').first();
    expect(readOnlySwitch.props().checked).toBe(true);
    expect(readOnlySwitch.props().disabled).toBe(true);
  });

  describe('autoRecoverAlerts', () => {
    it('shows untrack active alerts modal if `autoRecoverAlerts` is `true`', async () => {
      render(<RuleStatusDropdown {...{ ...props, autoRecoverAlerts: true }} />);

      await userEvent.click(await screen.findByTestId('ruleStatusDropdownSwitch'));

      expect(await screen.findByTestId('untrackAlertsModal')).toBeInTheDocument();
    });

    it('shows untrack active alerts modal if `autoRecoverAlerts` is `undefined`', async () => {
      render(<RuleStatusDropdown {...{ ...props, autoRecoverAlerts: undefined }} />);

      await userEvent.click(await screen.findByTestId('ruleStatusDropdownSwitch'));

      expect(await screen.findByTestId('untrackAlertsModal')).toBeInTheDocument();
    });

    it('does not show untrack active alerts modal if `autoRecoverAlerts` is `false`', async () => {
      render(<RuleStatusDropdown {...{ ...props, autoRecoverAlerts: false }} />);

      await userEvent.click(await screen.findByTestId('ruleStatusDropdownSwitch'));

      expect(await screen.queryByTestId('untrackAlertsModal')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(disableRule).toHaveBeenCalledWith(false);
      });
    });
  });
});
