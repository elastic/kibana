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
  it('renders without a section title', () => {
    renderSummary({});

    expect(screen.queryByText('What happens')).toBeNull();
  });

  it('includes demoted mode help for Per alert', () => {
    renderSummary({ groupingMode: 'per_episode' });

    expect(screen.getByTestId('dispatchConfigModeHelp')).toHaveTextContent(
      'Per alert. Best when you need visibility into each alert separately.'
    );
  });

  it('includes demoted mode help for Combined with group-by', () => {
    renderSummary({ groupingMode: 'per_field', throttleStrategy: 'time_interval' });

    expect(screen.getByTestId('dispatchConfigModeHelp')).toHaveTextContent(
      'Combined. Best when many related alerts should share one send per field value, for example per host or service.'
    );
  });

  it('includes demoted mode help for Combined without group-by', () => {
    renderSummary({ groupingMode: 'all', throttleStrategy: 'time_interval' });

    expect(screen.getByTestId('dispatchConfigModeHelp')).toHaveTextContent(
      'Combined. Best for periodic roll-ups when individual alerts are not needed.'
    );
  });

  describe('per_episode mode', () => {
    it('shows status change summary', () => {
      renderSummary({ groupingMode: 'per_episode', throttleStrategy: 'on_status_change' });

      expect(
        screen.getByText('Sends alert data when each alert opens and when it recovers.')
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
          'Sends alert data on status change, then every 5 minutes while the alert stays active.'
        )
      ).toBeDefined();
    });

    it('shows status change + repeat summary without interval when empty', () => {
      renderSummary({
        groupingMode: 'per_episode',
        throttleStrategy: 'per_status_interval',
        throttleInterval: '',
      });

      expect(
        screen.getByText('Sends alert data on status change, then repeats while active.')
      ).toBeDefined();
    });

    it('shows every evaluation summary', () => {
      renderSummary({ groupingMode: 'per_episode', throttleStrategy: 'every_time' });

      expect(
        screen.getByText(
          'Sends alert data on every rule evaluation. Use sparingly, with no frequency limit.'
        )
      ).toBeDefined();
    });
  });

  describe('per_field (combined group) mode', () => {
    it('shows prompt when no group-by fields are set', () => {
      renderSummary({
        groupingMode: 'per_field',
        groupBy: [],
        throttleStrategy: 'time_interval',
      });

      expect(
        screen.getByText('Add a field below to finish this combined send setup.')
      ).toBeDefined();
    });

    it('shows throttle summary with fields in code', () => {
      renderSummary({
        groupingMode: 'per_field',
        groupBy: ['host.name', 'service.name'],
        throttleStrategy: 'time_interval',
        throttleInterval: '10m',
      });

      expect(screen.getByTestId('dispatchConfigSummaryText')).toHaveTextContent(
        'Combines alerts that share host.name, service.name into one send per unique value, at most every 10 minutes.'
      );
      expect(screen.getByText('host.name').closest('code')).toBeTruthy();
      expect(screen.getByText('service.name').closest('code')).toBeTruthy();
    });

    it('shows throttle summary without interval when empty', () => {
      renderSummary({
        groupingMode: 'per_field',
        groupBy: ['host.name'],
        throttleStrategy: 'time_interval',
        throttleInterval: '',
      });

      expect(screen.getByTestId('dispatchConfigSummaryText')).toHaveTextContent(
        'Combines alerts that share host.name into one send per unique value.'
      );
    });

    it('shows every evaluation summary with fields', () => {
      renderSummary({
        groupingMode: 'per_field',
        groupBy: ['host.name'],
        throttleStrategy: 'every_time',
      });

      expect(screen.getByTestId('dispatchConfigSummaryText')).toHaveTextContent(
        'Combines alerts that share host.name into one send per unique value on every rule evaluation.'
      );
    });
  });

  describe('all (combined) mode', () => {
    it('shows throttle summary', () => {
      renderSummary({
        groupingMode: 'all',
        throttleStrategy: 'time_interval',
        throttleInterval: '1h',
      });

      expect(
        screen.getByText('Combines matching alerts into a single send at most every 1 hour.')
      ).toBeDefined();
    });

    it('shows throttle summary without interval when empty', () => {
      renderSummary({
        groupingMode: 'all',
        throttleStrategy: 'time_interval',
        throttleInterval: '',
      });

      expect(screen.getByText('Combines matching alerts into a single send.')).toBeDefined();
    });

    it('shows every evaluation summary', () => {
      renderSummary({ groupingMode: 'all', throttleStrategy: 'every_time' });

      expect(
        screen.getByText(
          'Combines matching alerts into a single send on every rule evaluation.'
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
        'Sends alert data on status change, then every 30 seconds while the alert stays active.'
      )
    ).toBeDefined();
  });
});
