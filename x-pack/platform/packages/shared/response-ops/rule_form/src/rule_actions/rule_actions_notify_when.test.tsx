/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { RuleActionsNotifyWhen } from './rule_actions_notify_when';
import type { RuleAction } from '@kbn/alerting-types';
import { RuleNotifyWhen } from '@kbn/alerting-types';
import { DEFAULT_FREQUENCY } from '../constants';

describe('ruleActionsNotifyWhen', () => {
  function setup(
    frequency: RuleAction['frequency'] = DEFAULT_FREQUENCY,
    hasAlertsMappings: boolean = true
  ) {
    return renderWithKibanaRenderContext(
      <RuleActionsNotifyWhen
        frequency={frequency}
        throttle={frequency.throttle ? Number(frequency.throttle[0]) : null}
        throttleUnit={frequency.throttle ? frequency.throttle[1] : 'm'}
        onChange={jest.fn()}
        onUseDefaultMessage={jest.fn()}
        hasAlertsMappings={hasAlertsMappings}
      />
    );
  }

  const expectDefaultFrequency = () => {
    const summaryOrPerRuleSelect = screen.getByTestId('summaryOrPerRuleSelect');
    expect(summaryOrPerRuleSelect.textContent).toContain('For each alert');

    const notifyWhenSelect = screen.getByTestId('notifyWhenSelect');
    expect(notifyWhenSelect.textContent).toContain('On status changes');
  };

  it('renders the passed-in frequency on load', () => {
    // Default frequency: summary=false, notifyWhen=CHANGE
    const { rerender } = setup();
    expectDefaultFrequency();

    // Re-render with DEFAULT_FREQUENCY again
    rerender(
      <RuleActionsNotifyWhen
        frequency={DEFAULT_FREQUENCY}
        throttle={DEFAULT_FREQUENCY.throttle ? Number(DEFAULT_FREQUENCY.throttle[0]) : null}
        throttleUnit={DEFAULT_FREQUENCY.throttle ? DEFAULT_FREQUENCY.throttle[1] : 'm'}
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

    rerender(
      <RuleActionsNotifyWhen
        frequency={throttleFrequency}
        throttle={Number(throttleFrequency.throttle[0])}
        throttleUnit={throttleFrequency.throttle[1]}
        onChange={jest.fn()}
        onUseDefaultMessage={jest.fn()}
        hasAlertsMappings
      />
    );
    {
      const summaryOrPerRuleSelect = screen.getByTestId('summaryOrPerRuleSelect');
      expect(summaryOrPerRuleSelect.textContent).toContain('For each alert');

      const notifyWhenSelect = screen.getByTestId('notifyWhenSelect');
      expect(notifyWhenSelect.textContent).toContain('On custom action intervals');
    }

    const throttleInput = screen.getByTestId('throttleInput') as HTMLInputElement;
    expect(Number(throttleInput.value)).toEqual(5);

    const throttleUnitInput = screen.getByTestId('throttleUnitInput') as HTMLSelectElement;
    expect(throttleUnitInput.value).toEqual('h');
  });

  it('hides the summary selector when hasAlertsMappings is false', () => {
    setup(DEFAULT_FREQUENCY, false);
    expect(screen.queryByTestId('summaryOrPerRuleSelect')).not.toBeInTheDocument();
  });
});
