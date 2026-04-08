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

  it('renders the passed-in frequency on load', () => {
    // Default frequency: summary=false, notifyWhen=CHANGE
    setup();
    {
      const summaryOrPerRuleSelect = screen.getByTestId('summaryOrPerRuleSelect');
      expect(summaryOrPerRuleSelect.textContent).toContain('For each alert');

      // EuiSuperSelect renders a button; selected option's inputDisplay text is shown
      const notifyWhenSelect = screen.getByTestId('notifyWhenSelect');
      expect(notifyWhenSelect.textContent).toContain('On status changes');
    }

    // Re-render with DEFAULT_FREQUENCY again
    setup(DEFAULT_FREQUENCY);
    {
      const summaryOrPerRuleSelect = screen.getAllByTestId('summaryOrPerRuleSelect')[1];
      expect(summaryOrPerRuleSelect.textContent).toContain('For each alert');

      const notifyWhenSelect = screen.getAllByTestId('notifyWhenSelect')[1];
      expect(notifyWhenSelect.textContent).toContain('On status changes');
    }

    // Render with throttle frequency
    setup({
      ...DEFAULT_FREQUENCY,
      throttle: '5h',
      notifyWhen: RuleNotifyWhen.THROTTLE,
    });
    {
      const summaryOrPerRuleSelects = screen.getAllByTestId('summaryOrPerRuleSelect');
      const summaryOrPerRuleSelect = summaryOrPerRuleSelects[summaryOrPerRuleSelects.length - 1];
      expect(summaryOrPerRuleSelect.textContent).toContain('For each alert');

      const notifyWhenSelects = screen.getAllByTestId('notifyWhenSelect');
      const notifyWhenSelect = notifyWhenSelects[notifyWhenSelects.length - 1];
      expect(notifyWhenSelect.textContent).toContain('On custom action intervals');
    }

    const throttleInputs = screen.getAllByTestId('throttleInput');
    const throttleInput = throttleInputs[throttleInputs.length - 1] as HTMLInputElement;
    expect(Number(throttleInput.value)).toEqual(5);

    const throttleUnitInputs = screen.getAllByTestId('throttleUnitInput');
    const throttleUnitInput = throttleUnitInputs[
      throttleUnitInputs.length - 1
    ] as HTMLSelectElement;
    expect(throttleUnitInput.value).toEqual('h');
  });

  it('hides the summary selector when hasAlertsMappings is false', () => {
    setup(DEFAULT_FREQUENCY, false);
    expect(screen.queryByTestId('summaryOrPerRuleSelect')).not.toBeInTheDocument();
  });
});
