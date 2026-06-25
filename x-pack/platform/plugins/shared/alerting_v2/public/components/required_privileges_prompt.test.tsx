/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RequiredPrivilegesPrompt } from './required_privileges_prompt';

describe('RequiredPrivilegesPrompt', () => {
  it('lists each required privilege with its concrete feature privilege and capability', () => {
    render(
      <I18nProvider>
        <RequiredPrivilegesPrompt
          pageName="Alerts"
          requiredPrivileges={[
            {
              featureId: 'alerting_v2_alerts',
              featureName: 'Alerts',
              privilege: 'read',
              capability: 'alerting_v2_alerts.read',
            },
            {
              featureId: 'alerting_v2_rules',
              featureName: 'Rules',
              privilege: 'read',
              capability: 'alerting_v2_rules.read',
            },
          ]}
        />
      </I18nProvider>
    );

    const alertsItem = screen.getByTestId('alertingV2RequiredPrivilege-alerting_v2_alerts');
    expect(within(alertsItem).getByText('Alerts')).toBeInTheDocument();
    expect(within(alertsItem).getByText('Read')).toBeInTheDocument();
    expect(within(alertsItem).getByText('alerting_v2_alerts.read')).toBeInTheDocument();

    const rulesItem = screen.getByTestId('alertingV2RequiredPrivilege-alerting_v2_rules');
    expect(within(rulesItem).getByText('alerting_v2_rules.read')).toBeInTheDocument();
  });

  it('renders the All privilege label', () => {
    render(
      <I18nProvider>
        <RequiredPrivilegesPrompt
          pageName="Rules"
          requiredPrivileges={[
            {
              featureId: 'alerting_v2_rules',
              featureName: 'Rules',
              privilege: 'all',
              capability: 'alerting_v2_rules.all',
            },
          ]}
        />
      </I18nProvider>
    );

    const rulesItem = screen.getByTestId('alertingV2RequiredPrivilege-alerting_v2_rules');
    expect(within(rulesItem).getByText('All')).toBeInTheDocument();
  });
});
