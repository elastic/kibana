/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  UniversalRulesIntroCallout,
  UNIVERSAL_RULES_INTRO_CALLOUT_DISMISSED_STORAGE_KEY,
} from './universal_rules_intro_callout';

const mockUseKibana = jest.fn();
const mockToursIsEnabled = jest.fn(() => true);
const mockCanAccessAlertingV2Rules = jest.fn(() => true);

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => mockUseKibana(),
}));

jest.mock('@kbn/alerting-v2-utils', () => ({
  canAccessAlertingV2Rules: () => mockCanAccessAlertingV2Rules(),
}));

const defaultServices = () => ({
  http: {
    basePath: {
      prepend: (path: string) => `/mock${path}`,
    },
  },
  tabs: undefined,
  notifications: {
    tours: {
      isEnabled: mockToursIsEnabled,
    },
  },
});

const renderCallout = () =>
  render(
    <IntlProvider locale="en">
      <UniversalRulesIntroCallout />
    </IntlProvider>
  );

describe('UniversalRulesIntroCallout', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    mockToursIsEnabled.mockReturnValue(true);
    mockCanAccessAlertingV2Rules.mockReturnValue(true);
    mockUseKibana.mockReturnValue({
      services: defaultServices(),
    });
  });

  it('renders title and Universal rules link', () => {
    renderCallout();

    expect(screen.getByText('Introducing Universal rules')).toBeInTheDocument();
    expect(screen.getByText('Universal rules')).toBeInTheDocument();
    expect(screen.getByTestId('universalRulesIntroCalloutUniversalLink')).toHaveAttribute(
      'href',
      '/mock/app/management/alertingV2/rules'
    );
    expect(screen.queryByText('Learn more')).not.toBeInTheDocument();
  });

  it('links to the host Universal tab when Observability tabs are provided', () => {
    mockUseKibana.mockReturnValue({
      services: {
        ...defaultServices(),
        tabs: [
          { id: 'v1Rules', href: '/mock/app/observability/alerting/rules/v1' },
          { id: 'v2Rules', href: '/mock/app/observability/alerting/rules/v2' },
        ],
      },
    });

    renderCallout();

    expect(screen.getByTestId('universalRulesIntroCalloutUniversalLink')).toHaveAttribute(
      'href',
      '/mock/app/observability/alerting/rules/v2'
    );
  });

  it('dismiss hides the callout and persists the dismissed state', () => {
    renderCallout();

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByTestId('universalRulesIntroCallout')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(UNIVERSAL_RULES_INTRO_CALLOUT_DISMISSED_STORAGE_KEY)).toBe(
      'true'
    );
  });

  it('is hidden when already dismissed', () => {
    window.localStorage.setItem(UNIVERSAL_RULES_INTRO_CALLOUT_DISMISSED_STORAGE_KEY, 'true');
    renderCallout();

    expect(screen.queryByTestId('universalRulesIntroCallout')).not.toBeInTheDocument();
  });

  it('does not show the callout when hideAnnouncements is enabled', () => {
    mockToursIsEnabled.mockReturnValue(false);
    renderCallout();

    expect(screen.queryByTestId('universalRulesIntroCallout')).not.toBeInTheDocument();
  });

  it('does not show the callout when the user cannot access Universal rules', () => {
    mockCanAccessAlertingV2Rules.mockReturnValue(false);
    renderCallout();

    expect(screen.queryByTestId('universalRulesIntroCallout')).not.toBeInTheDocument();
  });
});
