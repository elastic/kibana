/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { DashboardsSelector } from '@kbn/dashboards-selector';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import type { RuleFormState } from '../types';
import { RuleDashboards } from './rule_dashboards';

vi.mock('@kbn/dashboards-selector', () => {
  const mocked = {
    DashboardsSelector: vi.fn(() => null),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks', () => {
  const mocked = {
    useRuleFormState: vi.fn(),
    useRuleFormDispatch: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const { useRuleFormState, useRuleFormDispatch } = await vi.importMock<{
  useRuleFormState: Mock<{ formData: Partial<RuleFormState['formData']> }>;
  useRuleFormDispatch: Mock;
}>('../hooks');

const mockSelector = vi.mocked(DashboardsSelector);
const dispatch = vi.fn();
const uiActions = uiActionsPluginMock.createStartContract();

const renderDashboards = () =>
  render(<RuleDashboards uiActions={uiActions} />, {
    wrapper: ({ children }) => <IntlProvider>{children}</IntlProvider>,
  });

const getSelectorProps = () => {
  const call = mockSelector.mock.calls.at(-1);
  if (!call) {
    throw new Error('Expected the dashboards selector to render');
  }
  return call[0];
};

describe('RuleDashboards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRuleFormState.mockReturnValue({ formData: {} });
    useRuleFormDispatch.mockReturnValue(dispatch);
  });

  test('shows the related dashboards section without existing artifacts', () => {
    renderDashboards();

    const section = screen.getByTestId('ruleLinkedDashboards');
    expect(section).toBeVisible();
    expect(within(section).getByText('Related dashboards')).toBeVisible();
    expect(getSelectorProps()).toEqual(
      expect.objectContaining({ uiActions, dashboardsFormData: [] })
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('passes existing dashboards to the selector', () => {
    const dashboards = [{ id: 'dashboard-1' }, { id: 'dashboard-2' }];
    useRuleFormState.mockReturnValue({ formData: { artifacts: { dashboards } } });

    renderDashboards();

    expect(getSelectorProps().dashboardsFormData).toEqual(dashboards);
    expect(dispatch).not.toHaveBeenCalled();
  });

  test.each([
    {
      action: 'selecting dashboards',
      selectedOptions: [
        { label: 'First dashboard', value: 'dashboard-1' },
        { label: 'Second dashboard', value: 'dashboard-2' },
      ],
      dashboards: [{ id: 'dashboard-1' }, { id: 'dashboard-2' }],
    },
    { action: 'clearing dashboards', selectedOptions: [], dashboards: [] },
  ])('preserves other artifacts when $action', ({ selectedOptions, dashboards }) => {
    const investigationGuide = { blob: 'Investigate the alert' };
    useRuleFormState.mockReturnValue({
      formData: {
        artifacts: {
          dashboards: [{ id: 'previous-dashboard' }],
          investigation_guide: investigationGuide,
        },
      },
    });
    renderDashboards();

    getSelectorProps().onChange(selectedOptions);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'setRuleProperty',
      payload: {
        property: 'artifacts',
        value: { dashboards, investigation_guide: investigationGuide },
      },
    });
  });
});
