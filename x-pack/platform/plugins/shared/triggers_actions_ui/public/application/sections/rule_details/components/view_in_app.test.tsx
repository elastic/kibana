/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { render, screen, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { Rule } from '../../../../types';
import { ViewInApp } from './view_in_app';
import { useKibana } from '../../../../common/lib/kibana';

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

jest.mock('../../../../common/lib/kibana');

jest.mock('../../../lib/capabilities', () => ({
  hasSaveRulesCapability: jest.fn(() => true),
}));

const renderWithIntl = (ui: React.ReactElement) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      {ui}
    </IntlProvider>
  );
};

describe('view in app', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        application: {
          navigateToUrl: jest.fn(),
          navigateToApp: jest.fn(),
        },
        http: {
          basePath: {
            prepend: jest.fn((path: string) => path),
          },
        },
        alerting: {
          getNavigation: jest.fn(),
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  describe('link to the app that created the rule', () => {
    it('is disabled when there is no navigation', async () => {
      const rule = mockRule();
      const alerting = mockUseKibana().services.alerting;

      // Mock getNavigation to return null (no navigation)
      alerting!.getNavigation = jest.fn().mockResolvedValue(null);

      renderWithIntl(<ViewInApp rule={rule} />);
      const button = screen.getByRole('button', { name: /view in app/i });

      await waitFor(() => {
        expect(button).toBeDisabled();
      });
      expect(button).toHaveTextContent('View in app');

      expect(alerting!.getNavigation).toBeCalledWith(rule.id);
    });

    it('enabled when there is navigation', async () => {
      const rule = mockRule({ id: 'rule-with-nav', consumer: 'siem' });
      const alerting = mockUseKibana().services.alerting;
      const navigateToUrl = mockUseKibana().services.application.navigateToUrl;

      // Mock getNavigation to return a navigation path
      alerting!.getNavigation = jest.fn().mockResolvedValue('/rule');

      renderWithIntl(<ViewInApp rule={rule} />);
      const button = screen.getByRole('button', { name: /view in app/i });

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
      button.click();

      expect(navigateToUrl).toBeCalledWith('/rule');
    });
  });
});

function mockRule(overloads: Partial<Rule> = {}): Rule {
  return {
    id: uuidv4(),
    enabled: true,
    name: `rule-${uuidv4()}`,
    tags: [],
    ruleTypeId: '.noop',
    consumer: 'consumer',
    schedule: { interval: '1m' },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    apiKeyOwner: null,
    throttle: null,
    notifyWhen: null,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    revision: 0,
    ...overloads,
  };
}
