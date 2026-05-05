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

    expect(screen.getByText('Dispatch configuration')).toBeDefined();
  });

  describe('per_episode mode', () => {
    it('shows status change summary', () => {
      renderSummary({ groupingMode: 'per_episode', throttleStrategy: 'on_status_change' });

      expect(
        screen.getByText('Each episode is dispatched once per status transition.')
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
          'Each episode is dispatched on status change and repeated every 5 minute(s).'
        )
      ).toBeDefined();
    });

    it('shows status change + repeat summary without interval when empty', () => {
      renderSummary({
        groupingMode: 'per_episode',
        throttleStrategy: 'per_status_interval',
        throttleInterval: '',
      });

      expect(screen.getByText('Each episode is dispatched on status change.')).toBeDefined();
    });

    it('shows every evaluation summary', () => {
      renderSummary({ groupingMode: 'per_episode', throttleStrategy: 'every_time' });

      expect(
        screen.getByText('Each episode is dispatched on every evaluation with no throttle.')
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

      expect(screen.getByText('Add group-by fields to configure grouped dispatch.')).toBeDefined();
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
          'Episodes grouped by host.name, service.name are dispatched at most once every 10 minute(s).'
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

      expect(screen.getByText('Episodes grouped by host.name are dispatched.')).toBeDefined();
    });

    it('shows every evaluation summary with fields', () => {
      renderSummary({
        groupingMode: 'per_field',
        groupBy: ['host.name'],
        throttleStrategy: 'every_time',
      });

      expect(
        screen.getByText(
          'Episodes grouped by host.name are dispatched on every evaluation with no throttle.'
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
        screen.getByText('All matched episodes are dispatched at most once every 1 hour(s).')
      ).toBeDefined();
    });

    it('shows throttle summary without interval when empty', () => {
      renderSummary({
        groupingMode: 'all',
        throttleStrategy: 'time_interval',
        throttleInterval: '',
      });

      expect(screen.getByText('All matched episodes are dispatched.')).toBeDefined();
    });

    it('shows every evaluation summary', () => {
      renderSummary({ groupingMode: 'all', throttleStrategy: 'every_time' });

      expect(
        screen.getByText(
          'All matched episodes are dispatched on every evaluation with no throttle.'
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
        'Each episode is dispatched on status change and repeated every 30 second(s).'
      )
    ).toBeDefined();
  });
});
