/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render } from '@testing-library/react';
import {
  RulesListTableStatusCell,
  RulesListTableStatusCellProps,
} from './rules_list_table_status_cell';
import { RuleTableItem } from '../../../../types';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));

const mockRule: RuleTableItem = {
  id: '1',
  enabled: true,
  executionStatus: {
    status: 'ok',
  },
  lastRun: {
    outcome: 'succeeded',
  },
  nextRun: new Date('2020-08-20T19:23:38Z'),
} as RuleTableItem;

const onManageLicenseClickMock = jest.fn();

const ComponentWithLocale = (props: RulesListTableStatusCellProps) => {
  return (
    <IntlProvider locale="en">
      <RulesListTableStatusCell {...props} />
    </IntlProvider>
  );
};

describe('RulesListTableStatusCell', () => {
  beforeEach(() => {
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
  });

  afterEach(() => {
    onManageLicenseClickMock.mockClear();
  });

  it('should render successful rule outcome', async () => {
    const { getByTestId } = render(
      <ComponentWithLocale rule={mockRule} onManageLicenseClick={onManageLicenseClickMock} />
    );
    expect(getByTestId('ruleStatus-succeeded')).not.toBe(null);
  });

  it('should render failed rule outcome', async () => {
    const { getByTestId } = render(
      <ComponentWithLocale
        rule={
          {
            ...mockRule,
            executionStatus: {
              status: 'error',
            },
            lastRun: {
              outcome: 'failed',
            },
          } as RuleTableItem
        }
        onManageLicenseClick={onManageLicenseClickMock}
      />
    );
    expect(getByTestId('ruleStatus-failed')).not.toBe(null);
  });

  it('should render warning rule outcome', async () => {
    const { getByTestId } = render(
      <ComponentWithLocale
        rule={
          {
            ...mockRule,
            executionStatus: {
              status: 'warning',
            },
            lastRun: {
              outcome: 'warning',
            },
          } as RuleTableItem
        }
        onManageLicenseClick={onManageLicenseClickMock}
      />
    );
    expect(getByTestId('ruleStatus-warning')).not.toBe(null);
  });

  it('should render license errors', async () => {
    const { getByTestId, getByText } = render(
      <ComponentWithLocale
        rule={
          {
            ...mockRule,
            executionStatus: {
              status: 'warning',
            },
            lastRun: {
              outcome: 'warning',
              warning: 'license',
            },
          } as RuleTableItem
        }
        onManageLicenseClick={onManageLicenseClickMock}
      />
    );
    expect(getByTestId('ruleStatus-warning')).not.toBe(null);
    expect(getByText('License Error')).not.toBe(null);
  });

  it('should render loading indicator for new rules', async () => {
    const { getByLabelText } = render(
      <ComponentWithLocale
        rule={
          {
            ...mockRule,
            executionStatus: {
              status: 'pending',
            },
            lastRun: null,
            nextRun: null,
          } as RuleTableItem
        }
        onManageLicenseClick={onManageLicenseClickMock}
      />
    );

    expect(getByLabelText('Statistic is loading')).not.toBe(null);
  });

  it('should render rule with no last run', async () => {
    const { queryByText, getAllByText } = render(
      <ComponentWithLocale
        rule={
          {
            ...mockRule,
            executionStatus: {
              status: 'unknown',
            },
            lastRun: null,
          } as RuleTableItem
        }
        onManageLicenseClick={onManageLicenseClickMock}
      />
    );

    expect(queryByText('Statistic is loading')).toBe(null);
    expect(getAllByText('--')).not.toBe(null);
  });
});
