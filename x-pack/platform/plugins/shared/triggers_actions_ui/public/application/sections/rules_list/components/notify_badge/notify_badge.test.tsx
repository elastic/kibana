/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { render, screen, waitFor } from '@testing-library/react';
import { RulesListNotifyBadge } from './notify_badge';
import userEvent from '@testing-library/user-event';

jest.mock('../../../../../common/lib/kibana');

describe('RulesListNotifyBadge', () => {
  const onRuleChanged = jest.fn();
  const snoozeRule = jest.fn();
  const unsnoozeRule = jest.fn();
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('1990-01-01T05:00:00.000Z'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders an unsnoozed badge', () => {
    render(
      <RulesListNotifyBadge
        snoozeSettings={{
          name: 'rule 1',
          isSnoozedUntil: null,
          muteAll: false,
        }}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    // Rule without snooze
    expect(screen.getByTestId('rulesListNotifyBadge-unsnoozed')).toBeInTheDocument();
  });

  it('renders a snoozed badge', () => {
    render(
      <RulesListNotifyBadge
        snoozeSettings={{
          name: 'rule 1',
          muteAll: false,
          isSnoozedUntil: moment('1990-02-01').toDate(),
        }}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    expect(screen.getByTestId('rulesListNotifyBadge-snoozed')).toBeInTheDocument();
    expect(screen.getByText('Feb 1')).toBeInTheDocument();
  });

  it('renders an indefinitely snoozed badge', () => {
    render(
      <RulesListNotifyBadge
        snoozeSettings={{
          name: 'rule 1',
          muteAll: true,
          isSnoozedUntil: moment('1990-02-01').toDate(),
        }}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    expect(screen.getByTestId('rulesListNotifyBadge-snoozedIndefinitely')).toBeInTheDocument();
  });

  it('should allow the user to snooze rules', async () => {
    render(
      <RulesListNotifyBadge
        snoozeSettings={{
          name: 'rule 1',
          muteAll: false,
          isSnoozedUntil: null,
        }}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    await user.click(screen.getByTestId('rulesListNotifyBadge-unsnoozed'));
    await user.click(await screen.findByTestId('linkSnooze1h'));

    await waitFor(() => {
      expect(snoozeRule).toHaveBeenCalledWith({
        duration: 3600000,
        id: null,
        rRule: {
          count: 1,
          dtstart: '1990-01-01T05:00:00.000Z',
          tzid: 'America/New_York',
        },
      });
    });

    expect(onRuleChanged).toHaveBeenCalled();
  });

  it('should not allow the user to snooze the rule unless they have edit permissions', async () => {
    render(
      <RulesListNotifyBadge
        snoozeSettings={{
          name: 'rule 1',
          muteAll: false,
          isSnoozedUntil: null,
        }}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
        isRuleEditable={false}
      />
    );
    expect(screen.queryByTestId('rulesListNotifyBadge')).not.toBeInTheDocument();
  });

  it('should allow the user to unsnooze rules', async () => {
    render(
      <RulesListNotifyBadge
        snoozeSettings={{
          name: 'rule 1',
          muteAll: true,
        }}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    await user.click(screen.getByTestId('rulesListNotifyBadge-snoozedIndefinitely'));
    await user.click(await screen.findByTestId('ruleSnoozeCancel'));

    await waitFor(() => {
      expect(unsnoozeRule).toHaveBeenCalled();
    });
  });

  it('renders an invalid badge with invalid schedule timezone', () => {
    render(
      <RulesListNotifyBadge
        snoozeSettings={{
          name: 'rule 1',
          isSnoozedUntil: null,
          muteAll: false,
          snoozeSchedule: [
            { duration: 1, rRule: { dtstart: '1990-01-01T05:00:00.200Z', tzid: 'invalid' } },
          ],
        }}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    expect(screen.getByTestId('rulesListNotifyBadge-invalidSnooze')).toBeInTheDocument();
  });

  it('renders an invalid badge with invalid schedule byweekday', () => {
    render(
      <RulesListNotifyBadge
        snoozeSettings={{
          name: 'rule 1',
          isSnoozedUntil: null,
          muteAll: false,
          snoozeSchedule: [
            {
              duration: 1,
              rRule: {
                dtstart: '1990-01-01T05:00:00.200Z',
                tzid: 'America/New_York',
                byweekday: ['invalid'],
              },
            },
          ],
        }}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    expect(screen.getByTestId('rulesListNotifyBadge-invalidSnooze')).toBeInTheDocument();
  });

  it('should render the existing snooze schedule as disabled when the user does not have edit permissions', async () => {
    render(
      <RulesListNotifyBadge
        snoozeSettings={{
          name: 'rule 1',
          muteAll: false,
          isSnoozedUntil: moment('1990-02-01').toDate(),
        }}
        disabled={true}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
        isRuleEditable={false}
      />
    );

    expect(screen.getByTestId('rulesListNotifyBadge-snoozed')).toBeInTheDocument();
    expect(screen.getByTestId('rulesListNotifyBadge-snoozed')).toBeDisabled();
  });

  it('should clear an infinitive snooze schedule', async () => {
    render(
      <RulesListNotifyBadge
        snoozeSettings={{
          name: 'rule 1',
          muteAll: true,
          isSnoozedUntil: moment('1990-02-01').toDate(),
        }}
        onRuleChanged={onRuleChanged}
        snoozeRule={snoozeRule}
        unsnoozeRule={unsnoozeRule}
      />
    );

    await user.click(screen.getByTestId('rulesListNotifyBadge-snoozedIndefinitely'));
    await user.click(screen.getByTestId('ruleSnoozeCancel'));

    await waitFor(() => {
      expect(unsnoozeRule).toHaveBeenCalledWith(undefined);
    });
  });
});
