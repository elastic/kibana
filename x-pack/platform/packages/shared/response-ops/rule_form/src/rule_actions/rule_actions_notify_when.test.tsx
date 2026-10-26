/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { RuleActionsNotifyWhen } from './rule_actions_notify_when';
import type { RuleAction } from '@kbn/alerting-types';
import { RuleNotifyWhen } from '@kbn/alerting-types';
import { DEFAULT_FREQUENCY } from '../constants';

describe('ruleActionsNotifyWhen', () => {
  const getThrottleProps = (frequency?: RuleAction['frequency']) => {
    const throttle = frequency?.throttle;

    if (!throttle) {
      return {
        throttle: null,
        throttleUnit: 'm',
      };
    }

    return {
      throttle: parseInt(throttle, 10),
      throttleUnit: throttle.replace(/^\d+/, ''),
    };
  };

  function setup(
    frequency: RuleAction['frequency'] = DEFAULT_FREQUENCY,
    hasAlertsMappings: boolean = true
  ) {
    const { throttle, throttleUnit } = getThrottleProps(frequency);

    return renderWithI18n(
      <RuleActionsNotifyWhen
        frequency={frequency}
        throttle={throttle}
        throttleUnit={throttleUnit}
        onChange={jest.fn()}
        onUseDefaultMessage={jest.fn()}
        hasAlertsMappings={hasAlertsMappings}
      />
    );
  }

  const expectDefaultFrequency = () => {
    const summaryOrPerRuleSelect = screen.getByTestId('summaryOrPerRuleSelect');
    expect(summaryOrPerRuleSelect).toHaveTextContent('For each alert');

    const notifyWhenSelect = screen.getByTestId('notifyWhenSelect');
    expect(notifyWhenSelect).toHaveTextContent('On status changes');
  };

  it('renders the passed-in frequency on load', () => {
    // Default frequency: summary=false, notifyWhen=CHANGE
    const { rerender } = setup();
    expectDefaultFrequency();

    // Re-render with DEFAULT_FREQUENCY again
    const defaultThrottleProps = getThrottleProps(DEFAULT_FREQUENCY);
    rerender(
      <RuleActionsNotifyWhen
        frequency={DEFAULT_FREQUENCY}
        throttle={defaultThrottleProps.throttle}
        throttleUnit={defaultThrottleProps.throttleUnit}
        onChange={jest.fn()}
        onUseDefaultMessage={jest.fn()}
        hasAlertsMappings
      />
    );
    expectDefaultFrequency();

    // Render with throttle frequency
    const throttleFrequency = {
      ...DEFAULT_FREQUENCY,
      throttle: '5h',
      notifyWhen: RuleNotifyWhen.THROTTLE,
    };
    const throttleProps = getThrottleProps(throttleFrequency);

    rerender(
      <RuleActionsNotifyWhen
        frequency={throttleFrequency}
        throttle={throttleProps.throttle}
        throttleUnit={throttleProps.throttleUnit}
        onChange={jest.fn()}
        onUseDefaultMessage={jest.fn()}
        hasAlertsMappings
      />
    );
    {
      const summaryOrPerRuleSelect = screen.getByTestId('summaryOrPerRuleSelect');
      expect(summaryOrPerRuleSelect).toHaveTextContent('For each alert');

      const notifyWhenSelect = screen.getByTestId('notifyWhenSelect');
      expect(notifyWhenSelect).toHaveTextContent('On custom action intervals');
    }

    expect(screen.getByTestId('throttleInput')).toHaveValue(5);

    const throttleUnitInput = screen.getByTestId('throttleUnitInput') as HTMLSelectElement;
    expect(throttleUnitInput).toHaveValue('h');
  });

  it('hides the summary selector when hasAlertsMappings is false', () => {
    setup(DEFAULT_FREQUENCY, false);
    expect(screen.queryByTestId('summaryOrPerRuleSelect')).not.toBeInTheDocument();
  });
});
