/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import { DispatchConfigSummary } from './dispatch_config_summary';

const renderSummary = (overrides: {
  groupingMode?: GroupingMode;
  groupBy?: string[];
  throttleStrategy?: ThrottleStrategy;
  throttleInterval?: string;
}) =>
  render(
    <DispatchConfigSummary
      groupingMode={overrides.groupingMode ?? 'per_episode'}
      groupBy={overrides.groupBy ?? []}
      throttleStrategy={overrides.throttleStrategy ?? 'on_status_change'}
      throttleInterval={overrides.throttleInterval ?? ''}
    />
  );

describe('DispatchConfigSummary', () => {
  it('renders the title', () => {
    renderSummary({});

    expect(screen.getByText('Notification summary')).toBeDefined();
  });

  describe('per_episode mode', () => {
    it('shows status change summary', () => {
      renderSummary({ groupingMode: 'per_episode', throttleStrategy: 'on_status_change' });

      expect(
        screen.getByText('Sends one notification when an episode opens and one when it recovers.')
      ).toBeDefined();
    });

    it('shows status change + repeat summary with interval', () => {
      renderSummary({
        groupingMode: 'per_episode',
        throttleStrategy: 'per_status_interval',
        throttleInterval: '5m',
      });

      expect(
        screen.getByText(
          'Sends a notification on status change and repeats every 5 minutes while the episode remains active.'
        )
      ).toBeDefined();
    });

    it('shows status change + repeat summary without interval when empty', () => {
      renderSummary({
        groupingMode: 'per_episode',
        throttleStrategy: 'per_status_interval',
        throttleInterval: '',
      });

      expect(screen.getByText('Sends a notification on status change.')).toBeDefined();
    });

    it('shows every evaluation summary', () => {
      renderSummary({ groupingMode: 'per_episode', throttleStrategy: 'every_time' });

      expect(
        screen.getByText(
          'Sends a notification for every rule evaluation. No limit on notification frequency.'
        )
      ).toBeDefined();
    });
  });

  describe('per_field (group) mode', () => {
    it('shows prompt when no group-by fields are set', () => {
      renderSummary({
        groupingMode: 'per_field',
        groupBy: [],
        throttleStrategy: 'time_interval',
      });

      expect(
        screen.getByText('Select a field in Group by to configure group notifications.')
      ).toBeDefined();
    });

    it('shows throttle summary with fields', () => {
      renderSummary({
        groupingMode: 'per_field',
        groupBy: ['host.name', 'service.name'],
        throttleStrategy: 'time_interval',
        throttleInterval: '10m',
      });

      expect(
        screen.getByText(
          'Sends at most one notification every 10 minutes for each group sharing values in host.name, service.name.'
        )
      ).toBeDefined();
    });

    it('shows throttle summary without interval when empty', () => {
      renderSummary({
        groupingMode: 'per_field',
        groupBy: ['host.name'],
        throttleStrategy: 'time_interval',
        throttleInterval: '',
      });

      expect(
        screen.getByText('Sends a notification for each group sharing values in host.name.')
      ).toBeDefined();
    });

    it('shows every evaluation summary with fields', () => {
      renderSummary({
        groupingMode: 'per_field',
        groupBy: ['host.name'],
        throttleStrategy: 'every_time',
      });

      expect(
        screen.getByText(
          'Sends a notification for each group on every rule evaluation. No limit on notification frequency.'
        )
      ).toBeDefined();
    });
  });

  describe('all (digest) mode', () => {
    it('shows throttle summary', () => {
      renderSummary({
        groupingMode: 'all',
        throttleStrategy: 'time_interval',
        throttleInterval: '1h',
      });

      expect(
        screen.getByText(
          'Combines all matching episodes into one notification at most every 1 hour.'
        )
      ).toBeDefined();
    });

    it('shows throttle summary without interval when empty', () => {
      renderSummary({
        groupingMode: 'all',
        throttleStrategy: 'time_interval',
        throttleInterval: '',
      });

      expect(
        screen.getByText('Combines all matching episodes into one notification.')
      ).toBeDefined();
    });

    it('shows every evaluation summary', () => {
      renderSummary({ groupingMode: 'all', throttleStrategy: 'every_time' });

      expect(
        screen.getByText(
          'Combines all matching episodes into one notification on every rule evaluation. No limit on notification frequency.'
        )
      ).toBeDefined();
    });
  });

  it('formats different duration units', () => {
    renderSummary({
      groupingMode: 'per_episode',
      throttleStrategy: 'per_status_interval',
      throttleInterval: '30s',
    });

    expect(
      screen.getByText(
        'Sends a notification on status change and repeats every 30 seconds while the episode remains active.'
      )
    ).toBeDefined();
  });
});
