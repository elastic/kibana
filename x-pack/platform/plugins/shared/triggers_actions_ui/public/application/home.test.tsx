/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { render, screen } from '@testing-library/react';
import { createLocation, createMemoryHistory } from 'history';
import * as React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { getIsExperimentalFeatureEnabled } from '../common/get_experimental_features';
import type { MatchParams } from './home';
import TriggersActionsUIHome from './home';
import { hasShowActionsCapability } from './lib/capabilities';
import { useKibana } from '../common/lib/kibana';

jest.mock('../common/lib/kibana');
jest.mock('../common/get_experimental_features');
jest.mock('./lib/capabilities');

jest.mock('./sections/rules_list/components/rules_list', () => {
  return () => <div data-test-subj="rulesListComponents">{'Render Rule list component'}</div>;
});

jest.mock('./components/health_check', () => ({
  HealthCheck: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('./context/health_context', () => ({
  HealthContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@kbn/ebt-tools', () => ({
  PerformanceContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@kbn/alerts-ui-shared/src/common/hooks/use_get_rule_types_permissions', () => ({
  useGetRuleTypesPermissions: jest.fn().mockReturnValue({
    authorizedToReadAnyRules: true,
    authorizedToCreateAnyRules: true,
  }),
}));

const { useGetRuleTypesPermissions } = jest.requireMock(
  '@kbn/alerts-ui-shared/src/common/hooks/use_get_rule_types_permissions'
);

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const queryClient = new QueryClient();

describe('home', () => {
  beforeEach(() => {
    (hasShowActionsCapability as jest.Mock).mockClear();
    (getIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(() => false);
    useGetRuleTypesPermissions.mockClear();
  });

  it('renders rule list components', async () => {
    const props: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory({
        initialEntries: ['/rules'],
      }),
      location: createLocation('/rules'),
      match: {
        isExact: true,
        path: `/rules`,
        url: '',
        params: {
          section: 'rules',
        },
      },
    };

    render(
      <IntlProvider locale="en">
        <Router history={props.history}>
          <QueryClientProvider client={queryClient}>
            <TriggersActionsUIHome {...props} />
          </QueryClientProvider>
        </Router>
      </IntlProvider>
    );

    expect(await screen.findByTestId('rulesListComponents')).toBeInTheDocument();
  });

  it('shows the correct number of tabs', async () => {
    (hasShowActionsCapability as jest.Mock).mockImplementation(() => {
      return true;
    });
    const props: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory(),
      location: createLocation('/'),
      match: {
        isExact: true,
        path: `/connectors`,
        url: '',
        params: {
          section: 'connectors',
        },
      },
    };

    const home = mountWithIntl(
      <Router history={props.history}>
        <QueryClientProvider client={queryClient}>
          <TriggersActionsUIHome {...props} />
        </QueryClientProvider>
      </Router>
    );

    // Just rules and logs
    expect(home.find('span.euiTab__content').length).toBe(2);
  });

  it('hides the logs tab if the read rules privilege is missing', async () => {
    useGetRuleTypesPermissions.mockReturnValue({
      authorizedToReadAnyRules: false,
    });
    const props: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory({
        initialEntries: ['/rules'],
      }),
      location: createLocation('/rules'),
      match: {
        isExact: true,
        path: `/rules`,
        url: '',
        params: {
          section: 'rules',
        },
      },
    };

    const home = mountWithIntl(
      <Router history={props.history}>
        <QueryClientProvider client={queryClient}>
          <TriggersActionsUIHome {...props} />
        </QueryClientProvider>
      </Router>
    );

    // Just rules
    expect(home.find('span.euiTab__content').length).toBe(1);
  });

  describe('setHeaderActions', () => {
    beforeEach(() => {
      useKibanaMock().services.application.capabilities = {
        ...useKibanaMock().services.application.capabilities,
        rulesSettings: {
          show: true,
          readFlappingSettingsUI: true,
          readQueryDelaySettingsUI: true,
        },
      };
    });
    it('should render the header actions correctly when the user is authorized to create rules', async () => {
      useGetRuleTypesPermissions.mockReturnValue({
        authorizedToReadAnyRules: true,
        authorizedToCreateAnyRules: true,
      });
      const props: RouteComponentProps<MatchParams> = {
        history: createMemoryHistory({
          initialEntries: ['/rules'],
        }),
        location: createLocation('/rules'),
        match: {
          isExact: true,
          path: `/rules`,
          url: '',
          params: {
            section: 'rules',
          },
        },
      };

      render(
        <IntlProvider locale="en">
          <Router history={props.history}>
            <QueryClientProvider client={queryClient}>
              <TriggersActionsUIHome {...props} />
            </QueryClientProvider>
          </Router>
        </IntlProvider>
      );

      expect(await screen.findByTestId('createRuleButton')).toBeInTheDocument();
      expect(await screen.findByTestId('rulesSettingsLink')).toBeInTheDocument();
      expect(await screen.findByTestId('documentationLink')).toBeInTheDocument();
    });

    it('should not render the create rule button when the user is not authorized to create rules', async () => {
      useGetRuleTypesPermissions.mockReturnValue({
        authorizedToReadAnyRules: true,
        authorizedToCreateAnyRules: false,
      });

      const props: RouteComponentProps<MatchParams> = {
        history: createMemoryHistory({
          initialEntries: ['/rules'],
        }),
        location: createLocation('/rules'),
        match: {
          isExact: true,
          path: `/rules`,
          url: '',
          params: {
            section: 'rules',
          },
        },
      };

      render(
        <IntlProvider locale="en">
          <Router history={props.history}>
            <QueryClientProvider client={queryClient}>
              <TriggersActionsUIHome {...props} />
            </QueryClientProvider>
          </Router>
        </IntlProvider>
      );

      expect(await screen.queryByTestId('createRuleButton')).not.toBeInTheDocument();
      expect(await screen.findByTestId('rulesSettingsLink')).toBeInTheDocument();
      expect(await screen.findByTestId('documentationLink')).toBeInTheDocument();
    });
  });
});
