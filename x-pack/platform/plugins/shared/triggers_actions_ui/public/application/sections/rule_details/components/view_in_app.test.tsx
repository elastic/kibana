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
import userEvent from '@testing-library/user-event';
import type { Rule } from '../../../../types';
import { ViewInApp } from './view_in_app';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';

const mockGetNavigation = jest.fn();
const mockNavigateToUrl = jest.fn();

const mockStartServices = createStartServicesMock();
mockStartServices.alerting!.getNavigation = mockGetNavigation;
mockStartServices.application.navigateToUrl = mockNavigateToUrl;
mockStartServices.http.basePath.prepend = jest.fn((p: string) => p);

jest.mock('../../../../common/lib/kibana', () => ({
  __esModule: true,
  useKibana: jest.fn(() => ({
    services: mockStartServices,
  })),
}));
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

describe('view in app, link to the app that created the rule', () => {
  it('is disabled when there is no navigation', async () => {
    const rule = mockRule();
    mockGetNavigation.mockResolvedValueOnce(undefined);

    renderWithIntl(<ViewInApp rule={rule} />);
    const button = await screen.findByRole('button', { name: /view in app/i });

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('View in app');

    await waitFor(() => expect(mockGetNavigation).toBeCalledWith(rule.id));
  });

  it('enabled when there is navigation', async () => {
    const user = userEvent.setup();

    const rule = mockRule({ id: 'rule-with-nav', consumer: 'siem' });

    mockGetNavigation.mockResolvedValueOnce('/rule');

    renderWithIntl(<ViewInApp rule={rule} />);
    const button = screen.getByRole('button', { name: /view in app/i });

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });

    await user.click(button);
    expect(mockNavigateToUrl).toBeCalledWith('/rule');
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
