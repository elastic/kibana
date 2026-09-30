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
  CentralizedActionPoliciesBanner,
  CENTRALIZED_ACTION_POLICIES_BANNER_DISMISSED_STORAGE_KEY,
} from './centralized_action_policies_banner';
import { createMockLocators, MockLocatorProvider } from '../../test_utils/test_providers';
import { AlertingV2ActionPoliciesLocatorDefinition } from '../../locators';

const mockLocators = createMockLocators();
const mockNavigateToUrl = jest.fn();
const mockToursIsEnabled = jest.fn(() => true);
const MOCK_ACTION_POLICIES_DOCS_URL = 'https://docs.test/action-policies';
let mockCanWriteActionPolicies = true;

jest.mock('@kbn/core-di-browser', () => {
  const { UserCapabilities: ActualUserCapabilities } = jest.requireActual(
    '../../services/user_capabilities'
  );
  return {
    useService: (token: unknown) => {
      if (token === ActualUserCapabilities) {
        return {
          canWrite: (feature: string) =>
            feature === 'actionPolicies' ? mockCanWriteActionPolicies : true,
          canRead: () => true,
          can: () => true,
        };
      }
      const services: Record<string, unknown> = {
        application: { navigateToUrl: mockNavigateToUrl },
        http: { basePath: { prepend: (p: string) => `/mock${p}` } },
        notifications: { tours: { isEnabled: mockToursIsEnabled } },
        docLinks: {
          links: {
            alerting: {
              actionPolicies: MOCK_ACTION_POLICIES_DOCS_URL,
            },
          },
        },
      };
      return services[token as string] ?? {};
    },
    CoreStart: (key: string) => key,
  };
});

const renderBanner = () =>
  render(
    <MockLocatorProvider locators={mockLocators}>
      <IntlProvider locale="en">
        <CentralizedActionPoliciesBanner />
      </IntlProvider>
    </MockLocatorProvider>
  );

describe('CentralizedActionPoliciesBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanWriteActionPolicies = true;
    mockToursIsEnabled.mockReturnValue(true);
    window.localStorage.clear();
  });

  it('renders title and description', () => {
    renderBanner();

    expect(screen.getByText('Centralized action policies')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Action policies let you manage notification channels in one place and reuse them across multiple rules.'
      )
    ).toBeInTheDocument();
  });

  it('renders the illustration', () => {
    renderBanner();

    expect(screen.getByAltText('Centralized action policies illustration')).toBeInTheDocument();
  });

  it('Create action policy CTA has correct href and navigates via SPA', () => {
    renderBanner();

    const createBtn = screen.getByTestId('centralizedActionPoliciesCreate');
    expect(mockLocators.actionPolicyLocators.useUrl).toHaveBeenCalledWith({ page: 'create' });
    expect(createBtn).toHaveAttribute('href', '/mock-locator-url');
    fireEvent.click(createBtn);
    expect(mockLocators.actionPolicyLocators.navigateSync).toHaveBeenCalledWith({ page: 'create' });
  });

  it('Create action policy CTA params resolve to management action policies create URL', async () => {
    renderBanner();

    fireEvent.click(screen.getByTestId('centralizedActionPoliciesCreate'));

    const [params] = jest.mocked(mockLocators.actionPolicyLocators.navigateSync).mock.calls[0];
    const location = await AlertingV2ActionPoliciesLocatorDefinition.getLocation(params);
    expect(location).toMatchObject({
      app: 'management',
      path: '/alertingV2/action_policies/create',
    });
  });

  it('Learn more CTA has correct href and opens in a new tab', () => {
    renderBanner();

    const learnMoreBtn = screen.getByTestId('centralizedActionPoliciesLearnMore');
    expect(learnMoreBtn).toHaveAttribute('href', MOCK_ACTION_POLICIES_DOCS_URL);
    expect(learnMoreBtn).toHaveAttribute('target', '_blank');
  });

  it('is hidden when the user cannot write action policies', () => {
    mockCanWriteActionPolicies = false;
    renderBanner();

    expect(screen.queryByTestId('centralizedActionPoliciesBanner')).not.toBeInTheDocument();
  });

  it('is hidden when tours.isEnabled() returns false', () => {
    mockToursIsEnabled.mockReturnValue(false);
    renderBanner();

    expect(screen.queryByTestId('centralizedActionPoliciesBanner')).not.toBeInTheDocument();
  });

  it('dismiss hides the banner and persists the dismissed state to localStorage', () => {
    renderBanner();

    expect(screen.getByTestId('centralizedActionPoliciesBanner')).toBeInTheDocument();

    const dismissBtn = screen.getByTestId('centralizedActionPoliciesBannerDismiss');
    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId('centralizedActionPoliciesBanner')).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem(CENTRALIZED_ACTION_POLICIES_BANNER_DISMISSED_STORAGE_KEY)
    ).toBe('true');
  });

  it('does not write to localStorage before dismissal', () => {
    renderBanner();

    expect(
      window.localStorage.getItem(CENTRALIZED_ACTION_POLICIES_BANNER_DISMISSED_STORAGE_KEY)
    ).toBeNull();
  });

  it('is hidden when the dismissed key is already set in localStorage', () => {
    window.localStorage.setItem(CENTRALIZED_ACTION_POLICIES_BANNER_DISMISSED_STORAGE_KEY, 'true');
    renderBanner();

    expect(screen.queryByTestId('centralizedActionPoliciesBanner')).not.toBeInTheDocument();
  });

  it('still renders when localStorage contains a malformed value', () => {
    window.localStorage.setItem(
      CENTRALIZED_ACTION_POLICIES_BANNER_DISMISSED_STORAGE_KEY,
      'not-valid-json'
    );
    renderBanner();

    // Malformed values are treated as falsy by react-use — banner should render
    expect(screen.getByTestId('centralizedActionPoliciesBanner')).toBeInTheDocument();
  });
});
