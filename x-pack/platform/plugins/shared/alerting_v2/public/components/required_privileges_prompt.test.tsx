/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ALERTING_V2_FEATURE_IDS } from '@kbn/alerting-v2-constants';
import { RequiredPrivilegesPrompt } from './required_privileges_prompt';

describe('RequiredPrivilegesPrompt', () => {
  it('lists each required privilege with its feature name and privilege level', () => {
    render(
      <I18nProvider>
        <RequiredPrivilegesPrompt
          pageName="Alerts"
          requiredPrivileges={[
            {
              featureId: ALERTING_V2_FEATURE_IDS.alerts,
              featureName: 'Alerts',
              privilege: 'read',
            },
            {
              featureId: ALERTING_V2_FEATURE_IDS.rules,
              featureName: 'Rules',
              privilege: 'read',
            },
          ]}
        />
      </I18nProvider>
    );

    const alertsItem = screen.getByTestId(
      `alertingRequiredPrivilege-${ALERTING_V2_FEATURE_IDS.alerts}`
    );
    expect(within(alertsItem).getByText('Alerts')).toBeInTheDocument();
    expect(within(alertsItem).getByText('Read')).toBeInTheDocument();

    expect(
      screen.getByTestId(`alertingRequiredPrivilege-${ALERTING_V2_FEATURE_IDS.rules}`)
    ).toBeInTheDocument();
  });

  it('does not surface the underlying UI capability id', () => {
    render(
      <I18nProvider>
        <RequiredPrivilegesPrompt
          pageName="Rules"
          requiredPrivileges={[
            {
              featureId: ALERTING_V2_FEATURE_IDS.rules,
              featureName: 'Rules',
              privilege: 'read',
            },
          ]}
        />
      </I18nProvider>
    );

    expect(
      screen.queryByText(new RegExp(`${ALERTING_V2_FEATURE_IDS.rules}\\.read`))
    ).not.toBeInTheDocument();
  });

  it('renders the All privilege label', () => {
    render(
      <I18nProvider>
        <RequiredPrivilegesPrompt
          pageName="Rules"
          requiredPrivileges={[
            {
              featureId: ALERTING_V2_FEATURE_IDS.rules,
              featureName: 'Rules',
              privilege: 'all',
            },
          ]}
        />
      </I18nProvider>
    );

    const rulesItem = screen.getByTestId(
      `alertingRequiredPrivilege-${ALERTING_V2_FEATURE_IDS.rules}`
    );
    expect(within(rulesItem).getByText('All')).toBeInTheDocument();
  });
});
