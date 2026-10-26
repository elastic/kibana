/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SeveritySection } from './severity_section';
import {
  Comparator,
  getSeverityValidationError,
  type AlertCondition,
  type SeverityConfig,
} from './form_types';

const condition = (overrides: Partial<AlertCondition> = {}): AlertCondition => ({
  id: 'c1',
  metric: 'cpu_avg',
  comparator: Comparator.GT,
  threshold: [0.8],
  ...overrides,
});

const renderSection = (props: { severity?: SeverityConfig; alertConditions: AlertCondition[] }) => {
  const onChange = jest.fn<void, [SeverityConfig | undefined]>();
  render(
    <IntlProvider locale="en">
      <SeveritySection
        severity={props.severity}
        alertConditions={props.alertConditions}
        onChange={onChange}
      />
    </IntlProvider>
  );
  return { onChange };
};

describe('SeveritySection', () => {
  it('enables a default single severity when the switch is turned on', () => {
    const { onChange } = renderSection({ alertConditions: [condition()] });
    fireEvent.click(screen.getByTestId('ruleBuilderSeverityEnable'));
    expect(onChange).toHaveBeenCalledWith({
      mode: 'single',
      singleLevelSeverity: 'info',
      levels: [],
    });
  });

  it('clears severity when the switch is turned off', () => {
    const { onChange } = renderSection({
      alertConditions: [condition()],
      severity: { mode: 'single', singleLevelSeverity: 'high', levels: [] },
    });
    fireEvent.click(screen.getByTestId('ruleBuilderSeverityEnable'));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('updates the level in single mode', () => {
    const { onChange } = renderSection({
      alertConditions: [condition()],
      severity: { mode: 'single', singleLevelSeverity: 'high', levels: [] },
    });
    fireEvent.change(screen.getByTestId('ruleBuilderSeveritySingleLevel'), {
      target: { value: 'critical' },
    });
    expect(onChange).toHaveBeenCalledWith({
      mode: 'single',
      singleLevelSeverity: 'critical',
      levels: [],
    });
  });

  it('promotes to multi when adding a level from single', () => {
    const { onChange } = renderSection({
      alertConditions: [condition()],
      severity: { mode: 'single', singleLevelSeverity: 'high', levels: [] },
    });
    fireEvent.click(screen.getByTestId('ruleBuilderAddSeverityLevel'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as SeverityConfig;
    expect(next.mode).toBe('multi');
    expect(next.levels).toHaveLength(2);
    // Keeps the single severity as the least-severe band (at the condition threshold) and
    // seeds a more-severe band one step beyond it — both valid for the `>` breach direction.
    expect(next.levels.map((l) => l.severity)).toEqual(['high', 'critical']);
    expect(next.levels.map((l) => l.threshold)).toEqual([0.8, 1.8]);
  });

  it('promotes a top-severity single to a valid, distinct pair of bands', () => {
    const { onChange } = renderSection({
      alertConditions: [condition({ comparator: Comparator.GT, threshold: [0.8] })],
      severity: { mode: 'single', singleLevelSeverity: 'critical', levels: [] },
    });
    fireEvent.click(screen.getByTestId('ruleBuilderAddSeverityLevel'));
    const next = onChange.mock.calls[0][0] as SeverityConfig;

    // Preserve the original order: the single severity remains the first band.
    expect(next.levels.map((l) => l.severity)).toEqual(['critical', 'info']);
    expect(next.levels.map((l) => l.threshold)).toEqual([1.8, 0.8]);

    // The seeded config must be valid (no duplicate/ordering error).
    expect(getSeverityValidationError(next, condition({ threshold: [0.8] }))).toBeNull();
  });

  it('hides the add-level button and explains why for range comparators', () => {
    renderSection({
      alertConditions: [condition({ comparator: Comparator.BETWEEN, threshold: [0.8, 0.9] })],
      severity: { mode: 'single', singleLevelSeverity: 'high', levels: [] },
    });
    expect(screen.queryByTestId('ruleBuilderAddSeverityLevel')).not.toBeInTheDocument();
    expect(screen.getByText(/Multiple severity levels are not available/i)).toBeInTheDocument();
  });

  it('renders a threshold with an operator prepend for every level', () => {
    renderSection({
      alertConditions: [condition()],
      severity: {
        mode: 'multi',
        singleLevelSeverity: 'high',
        levels: [
          { id: 'l1', severity: 'low', threshold: 0.8 },
          { id: 'l2', severity: 'high', threshold: 0.95 },
        ],
      },
    });
    // Every level is a band: it carries its own threshold with the inherited comparator prepend.
    expect(screen.getAllByText('>').length).toBeGreaterThan(0);
    expect(screen.getByTestId('ruleBuilderSeverityThreshold-0')).toHaveValue(0.8);
    expect(screen.getByTestId('ruleBuilderSeverityThreshold-1')).toHaveValue(0.95);
  });

  it('gives every band control a programmatic label identifying its band', () => {
    renderSection({
      alertConditions: [condition()],
      severity: {
        mode: 'multi',
        singleLevelSeverity: 'high',
        levels: [
          { id: 'l1', severity: 'low', threshold: 0.8 },
          { id: 'l2', severity: 'high', threshold: 0.95 },
        ],
      },
    });
    // Row 2 has no visible column heading, so it must be reachable by an accessible name.
    expect(screen.getByLabelText('Severity level for band 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Threshold for band 2')).toBeInTheDocument();
  });

  it('keeps a cleared threshold as NaN instead of coercing it to 0', () => {
    const { onChange } = renderSection({
      alertConditions: [condition()],
      severity: {
        mode: 'multi',
        singleLevelSeverity: 'high',
        levels: [
          { id: 'l1', severity: 'low', threshold: 0.8 },
          { id: 'l2', severity: 'high', threshold: 0.95 },
        ],
      },
    });
    fireEvent.change(screen.getByTestId('ruleBuilderSeverityThreshold-1'), {
      target: { value: '' },
    });
    const next = onChange.mock.calls[0][0] as SeverityConfig;
    // Not coerced to 0 — left non-finite so `invalid_threshold` validation can reject it.
    expect(Number.isNaN(next.levels[1].threshold)).toBe(true);
  });

  it('caps the threshold input with a lower bound for an ascending comparator', () => {
    renderSection({
      alertConditions: [condition({ comparator: Comparator.GT, threshold: [0.8] })],
      severity: {
        mode: 'multi',
        singleLevelSeverity: 'high',
        levels: [
          { id: 'l1', severity: 'low', threshold: 0.8 },
          { id: 'l2', severity: 'high', threshold: 0.95 },
        ],
      },
    });
    expect(screen.getByTestId('ruleBuilderSeverityThreshold-0')).toHaveAttribute('min', '0.8');
    expect(screen.getByTestId('ruleBuilderSeverityThreshold-0')).not.toHaveAttribute('max');
  });

  it('caps the threshold input with an upper bound for a descending comparator', () => {
    renderSection({
      alertConditions: [condition({ comparator: Comparator.LT, threshold: [500] })],
      severity: {
        mode: 'multi',
        singleLevelSeverity: 'high',
        levels: [
          { id: 'l1', severity: 'low', threshold: 450 },
          { id: 'l2', severity: 'high', threshold: 100 },
        ],
      },
    });
    expect(screen.getByTestId('ruleBuilderSeverityThreshold-0')).toHaveAttribute('max', '500');
    expect(screen.getByTestId('ruleBuilderSeverityThreshold-0')).not.toHaveAttribute('min');
  });

  it('adds a severity level in multi mode', () => {
    const { onChange } = renderSection({
      alertConditions: [condition()],
      severity: {
        mode: 'multi',
        singleLevelSeverity: 'high',
        levels: [{ id: 'l1', severity: 'low', threshold: 0.8 }],
      },
    });
    fireEvent.click(screen.getByTestId('ruleBuilderAddSeverityLevel'));
    const next = onChange.mock.calls[0][0] as SeverityConfig;
    expect(next.levels).toHaveLength(2);
    // Defaults to the next level in the hierarchy
    expect(next.levels[1].severity).toBe('medium');
  });

  it('disables adding levels once every severity is in use', () => {
    renderSection({
      alertConditions: [condition()],
      severity: {
        mode: 'multi',
        singleLevelSeverity: 'high',
        levels: [
          { id: 'l1', severity: 'info', threshold: 0.5 },
          { id: 'l2', severity: 'low', threshold: 0.6 },
          { id: 'l3', severity: 'medium', threshold: 0.7 },
          { id: 'l4', severity: 'high', threshold: 0.8 },
          { id: 'l5', severity: 'critical', threshold: 0.9 },
        ],
      },
    });
    expect(screen.getByTestId('ruleBuilderAddSeverityLevel')).toBeDisabled();
  });

  it('demotes to single when removing down to one level', () => {
    const { onChange } = renderSection({
      alertConditions: [condition()],
      severity: {
        mode: 'multi',
        singleLevelSeverity: 'high',
        levels: [
          { id: 'l1', severity: 'low', threshold: 0.8 },
          { id: 'l2', severity: 'high', threshold: 0.95 },
        ],
      },
    });
    fireEvent.click(screen.getByTestId('ruleBuilderRemoveSeverityLevel-1'));
    const next = onChange.mock.calls[0][0] as SeverityConfig;
    expect(next.mode).toBe('single');
    expect(next.levels).toHaveLength(0);
    expect(next.singleLevelSeverity).toBe('low');
  });

  it('removes one level while staying in multi mode when three or more remain', () => {
    const { onChange } = renderSection({
      alertConditions: [condition()],
      severity: {
        mode: 'multi',
        singleLevelSeverity: 'high',
        levels: [
          { id: 'l1', severity: 'low', threshold: 0.8 },
          { id: 'l2', severity: 'medium', threshold: 0.9 },
          { id: 'l3', severity: 'high', threshold: 0.95 },
        ],
      },
    });
    fireEvent.click(screen.getByTestId('ruleBuilderRemoveSeverityLevel-2'));
    const next = onChange.mock.calls[0][0] as SeverityConfig;
    expect(next.mode).toBe('multi');
    expect(next.levels.map((l) => l.severity)).toEqual(['low', 'medium']);
  });

  it('shows a validation error when band thresholds are out of order', () => {
    renderSection({
      alertConditions: [condition()],
      severity: {
        mode: 'multi',
        singleLevelSeverity: 'high',
        levels: [
          { id: 'l1', severity: 'low', threshold: 0.8 },
          { id: 'l2', severity: 'medium', threshold: 0.95 },
          { id: 'l3', severity: 'high', threshold: 0.9 },
        ],
      },
    });
    expect(screen.getByTestId('ruleBuilderSeverityValidationError')).toBeInTheDocument();
  });

  it('shows no validation error for a well-formed multi config', () => {
    renderSection({
      alertConditions: [condition()],
      severity: {
        mode: 'multi',
        singleLevelSeverity: 'high',
        levels: [
          { id: 'l1', severity: 'low', threshold: 0.8 },
          { id: 'l2', severity: 'high', threshold: 0.95 },
        ],
      },
    });
    expect(screen.queryByTestId('ruleBuilderSeverityValidationError')).not.toBeInTheDocument();
  });
});
