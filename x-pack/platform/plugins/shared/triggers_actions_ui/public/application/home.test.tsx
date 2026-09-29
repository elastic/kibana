/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
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

vi.mock('../common/lib/kibana');
vi.mock('../common/get_experimental_features');
vi.mock('./lib/capabilities');

vi.mock('./sections/rules_list/components/rules_list', () => {
  return () => <div data-test-subj="rulesListComponents">{'Render Rule list component'}</div>;
});

vi.mock('./components/health_check', () => {
  const mocked = {
    HealthCheck: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./context/health_context', () => {
  const mocked = {
    HealthContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/ebt-tools', () => {
  const mocked = {
    PerformanceContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/alerts-ui-shared/src/common/hooks/use_get_rule_types_permissions', () => {
  const mocked = {
    useGetRuleTypesPermissions: vi.fn().mockReturnValue({
      authorizedToReadAnyRules: true,
      authorizedToCreateAnyRules: true,
    }),
  };
  return { ...mocked, default: mocked };
});

const { useGetRuleTypesPermissions } = await vi.importMock(
  '@kbn/alerts-ui-shared/src/common/hooks/use_get_rule_types_permissions'
);

const useKibanaMock = useKibana as Mocked<typeof useKibana>;

const renderHome = (props: RouteComponentProps<MatchParams>) =>
  render(
    <IntlProvider locale="en">
      <Router history={props.history}>
        <QueryClientProvider client={new QueryClient()}>
          <TriggersActionsUIHome {...props} />
        </QueryClientProvider>
      </Router>
    </IntlProvider>
  );

describe('home', () => {
  beforeEach(() => {
    (hasShowActionsCapability as Mock).mockClear();
    (getIsExperimentalFeatureEnabled as Mock).mockImplementation(() => false);
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

    renderHome(props);

    expect(await screen.findByTestId('rulesListComponents')).toBeInTheDocument();
  });

  it('shows the correct number of tabs', async () => {
    (hasShowActionsCapability as Mock).mockImplementation(() => {
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

    renderHome(props);

    // Just rules and logs
    expect(screen.getAllByRole('tab').length).toBe(2);
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

    renderHome(props);

    // Just rules
    expect(screen.getAllByRole('tab').length).toBe(1);
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

      renderHome(props);

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

      renderHome(props);

      expect(await screen.findByTestId('rulesSettingsLink')).toBeInTheDocument();
      expect(await screen.findByTestId('documentationLink')).toBeInTheDocument();
      expect(screen.queryByTestId('createRuleButton')).not.toBeInTheDocument();
    });
  });
});
