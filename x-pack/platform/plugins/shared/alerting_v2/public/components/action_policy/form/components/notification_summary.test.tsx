/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import { FormProvider, useForm } from 'react-hook-form';
import { DEFAULT_FORM_STATE } from '../constants';
import type { ActionPolicyFormState } from '../types';
import { NotificationSummary, getDispatchSummary } from './notification_summary';

describe('getDispatchSummary', () => {
  const summary = (overrides: {
    groupingMode?: GroupingMode;
    groupBy?: string[];
    throttleStrategy?: ThrottleStrategy;
    throttleInterval?: string;
  }) =>
    getDispatchSummary({
      groupingMode: overrides.groupingMode ?? 'per_episode',
      groupBy: overrides.groupBy ?? [],
      throttleStrategy: overrides.throttleStrategy ?? 'on_status_change',
      throttleInterval: overrides.throttleInterval ?? '',
    });

  describe('per_episode mode', () => {
    it('describes the status change strategy', () => {
      expect(summary({ throttleStrategy: 'on_status_change' })).toBe(
        'Sends one notification when an episode opens and one when it recovers.'
      );
    });

    it('describes status change + repeat with an interval', () => {
      expect(summary({ throttleStrategy: 'per_status_interval', throttleInterval: '5m' })).toBe(
        'Sends a notification on status change and repeats every 5 minutes while the episode remains active.'
      );
    });

    it('falls back when the repeat interval is empty', () => {
      expect(summary({ throttleStrategy: 'per_status_interval', throttleInterval: '' })).toBe(
        'Sends a notification on status change.'
      );
    });

    it('describes the every-evaluation strategy', () => {
      expect(summary({ throttleStrategy: 'every_time' })).toBe(
        'Sends a notification for every rule evaluation. No limit on notification frequency.'
      );
    });
  });

  describe('per_field (group) mode', () => {
    it('prompts to select a field when none are set', () => {
      expect(
        summary({ groupingMode: 'per_field', groupBy: [], throttleStrategy: 'time_interval' })
      ).toBe('Select a field in Group by to configure group notifications.');
    });

    it('describes the throttle strategy with fields and interval', () => {
      expect(
        summary({
          groupingMode: 'per_field',
          groupBy: ['host.name', 'service.name'],
          throttleStrategy: 'time_interval',
          throttleInterval: '10m',
        })
      ).toBe(
        'Sends at most one notification every 10 minutes for each group sharing values in host.name, service.name.'
      );
    });

    it('describes the throttle strategy without an interval', () => {
      expect(
        summary({
          groupingMode: 'per_field',
          groupBy: ['host.name'],
          throttleStrategy: 'time_interval',
          throttleInterval: '',
        })
      ).toBe('Sends a notification for each group sharing values in host.name.');
    });

    it('describes the every-evaluation strategy with fields', () => {
      expect(
        summary({
          groupingMode: 'per_field',
          groupBy: ['host.name'],
          throttleStrategy: 'every_time',
        })
      ).toBe(
        'Sends a notification for each group on every rule evaluation. No limit on notification frequency.'
      );
    });
  });

  describe('all (digest) mode', () => {
    it('describes the throttle strategy with an interval', () => {
      expect(
        summary({ groupingMode: 'all', throttleStrategy: 'time_interval', throttleInterval: '1h' })
      ).toBe('Combines all matching episodes into one notification at most every 1 hour.');
    });

    it('describes the throttle strategy without an interval', () => {
      expect(
        summary({ groupingMode: 'all', throttleStrategy: 'time_interval', throttleInterval: '' })
      ).toBe('Combines all matching episodes into one notification.');
    });

    it('describes the every-evaluation strategy', () => {
      expect(summary({ groupingMode: 'all', throttleStrategy: 'every_time' })).toBe(
        'Combines all matching episodes into one notification on every rule evaluation. No limit on notification frequency.'
      );
    });
  });

  it('formats different duration units', () => {
    expect(summary({ throttleStrategy: 'per_status_interval', throttleInterval: '30s' })).toBe(
      'Sends a notification on status change and repeats every 30 seconds while the episode remains active.'
    );
  });
});

describe('NotificationSummary', () => {
  const renderSummary = (overrides: Partial<ActionPolicyFormState> = {}) => {
    const TestComponent = () => {
      const methods = useForm<ActionPolicyFormState>({
        defaultValues: { ...DEFAULT_FORM_STATE, ...overrides },
      });

      return (
        <I18nProvider>
          <FormProvider {...methods}>
            <NotificationSummary />
          </FormProvider>
        </I18nProvider>
      );
    };

    return render(<TestComponent />);
  };

  it('shows the mode description and the outcome for the current configuration', () => {
    renderSummary({ groupingMode: 'per_episode', throttleStrategy: 'on_status_change' });

    expect(screen.getByText('Notification summary')).toBeInTheDocument();
    expect(screen.getByTestId('notificationSummaryModeText')).toHaveTextContent(
      'Each matching episode triggers its own notification'
    );
    expect(screen.getByTestId('notificationSummaryOutcomeText')).toHaveTextContent(
      'Sends one notification when an episode opens and one when it recovers.'
    );
  });

  it('prompts to select a field for group mode with no fields selected', () => {
    renderSummary({ groupingMode: 'per_field', groupBy: [], throttleStrategy: 'time_interval' });

    expect(screen.getByTestId('notificationSummaryModeText')).toHaveTextContent(
      'Bundles episodes that share the same field value'
    );
    expect(screen.getByTestId('notificationSummaryOutcomeText')).toHaveTextContent(
      'Select a field in Group by to configure group notifications.'
    );
  });
});
