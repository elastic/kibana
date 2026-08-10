/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { QueryClientProvider } from '@kbn/react-query';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiProvider } from '@elastic/eui';
import { ThemeProvider } from '@emotion/react';

import { OsqueryAction } from '.';
import { queryClient } from '../../query_client';
import * as hooks from '../use_is_osquery_available';
import { useKibana } from '../../common/lib/kibana';
import { AGENT_STATUS_ERROR, EMPTY_PROMPT, NOT_AVAILABLE, PERMISSION_DENIED } from './translations';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/experimental_features_context', () => ({
  ...jest.requireActual('../../common/experimental_features_context'),
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));

// Infra's embedded usage renders <OsqueryAction formType="simple" hideAgentsField ... />,
// which terminates in <LiveQuery ...>. Stub LiveQuery so these tests can assert the
// props the osquery package receives from the embedder without mounting the full
// Monaco + agent-selector + submit subtree.
jest.mock('../../live_queries', () => ({
  LiveQuery: (props: Record<string, unknown>) => (
    <div
      data-test-subj="live-query-mock"
      data-form-type={String(props.formType ?? '')}
      data-hide-agents-field={String(props.hideAgentsField ?? '')}
      data-agent-id={String(props.agentId ?? '')}
    />
  ),
}));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const defaultUseOsqueryAvailableResult = {
  osqueryAvailable: true,
  agentFetched: true,
  isLoading: false,
  policyFetched: true,
  policyLoading: false,
};

const spyUseIsOsqueryAvailable = jest
  .spyOn(hooks, 'useIsOsqueryAvailable')
  .mockImplementation(() => ({
    ...defaultUseOsqueryAvailableResult,
    agentData: {},
  }));

const defaultPermissions = {
  osquery: {
    runSavedQueries: false,
    readSavedQueries: false,
  },
};

const mockKibana = (permissionType: unknown = defaultPermissions) => {
  useKibanaMock.mockReturnValue({
    services: {
      application: {
        capabilities: permissionType,
      },
      notifications: {
        toasts: {
          addError: jest.fn(),
          addSuccess: jest.fn(),
          remove: jest.fn(),
        },
      },
    },
  } as unknown as ReturnType<typeof useKibana>);
};

const spyOsquery = (data: Record<string, unknown> = {}) => {
  spyUseIsOsqueryAvailable.mockImplementation(() => ({
    ...defaultUseOsqueryAvailableResult,
    ...data,
  }));
};

const properPermissions = {
  osquery: {
    runSavedQueries: true,
    writeLiveQueries: true,
  },
};

const renderWithContext = (Element: React.ReactElement) =>
  render(
    <EuiProvider>
      <ThemeProvider
        theme={{
          euiTheme: {
            colors: { success: '#00BFB3' },
            border: { width: { thin: '1px', thick: '2px' } },
          } as unknown as EuiThemeComputed<{}>,
        }}
      >
        <IntlProvider locale={'en'}>
          <QueryClientProvider client={queryClient}>{Element}</QueryClientProvider>
        </IntlProvider>
      </ThemeProvider>
    </EuiProvider>
  );

describe('Osquery Action', () => {
  it('should return empty prompt when agentFetched and no agentData', async () => {
    spyOsquery();
    mockKibana();

    const { getByText } = renderWithContext(<OsqueryAction agentId={'test'} formType={'steps'} />);
    expect(getByText(EMPTY_PROMPT)).toBeInTheDocument();
  });
  it('should return permission denied when agentFetched and agentData available', async () => {
    spyOsquery({ agentData: {} });
    mockKibana();

    const { getByText } = renderWithContext(<OsqueryAction agentId={'test'} formType={'steps'} />);
    expect(getByText(PERMISSION_DENIED)).toBeInTheDocument();
  });
  it('should return agent status error when permissions are ok and agent status is wrong', async () => {
    spyOsquery({ agentData: {} });
    mockKibana(properPermissions);
    const { getByText } = renderWithContext(<OsqueryAction agentId={'test'} formType={'steps'} />);
    expect(getByText(AGENT_STATUS_ERROR)).toBeInTheDocument();
  });
  it('should return permission denied if just one permission (runSavedQueries) is available', async () => {
    spyOsquery({ agentData: {} });
    mockKibana({
      osquery: {
        runSavedQueries: true,
      },
    });
    const { getByText } = renderWithContext(<OsqueryAction agentId={'test'} formType={'steps'} />);
    expect(getByText(PERMISSION_DENIED)).toBeInTheDocument();
  });
  it('should return permission denied if just one permission (readSavedQueries) is available', async () => {
    spyOsquery({ agentData: {} });
    mockKibana({
      osquery: {
        readSavedQueries: true,
      },
    });
    const { getByText } = renderWithContext(<OsqueryAction agentId={'test'} formType={'steps'} />);
    expect(getByText(PERMISSION_DENIED)).toBeInTheDocument();
  });
  it('should return permission denied if no writeLiveQueries', async () => {
    spyOsquery({ agentData: {} });
    mockKibana({
      osquery: {
        writeLiveQueries: true,
      },
    });
    const { getByText } = renderWithContext(<OsqueryAction agentId={'test'} formType={'steps'} />);
    expect(getByText(AGENT_STATUS_ERROR)).toBeInTheDocument();
  });
  it('should return not available prompt if osquery is not available', async () => {
    spyOsquery({ agentData: {}, osqueryAvailable: false });
    mockKibana({
      osquery: {
        writeLiveQueries: true,
      },
    });
    const { getByText } = renderWithContext(<OsqueryAction agentId={'test'} formType={'steps'} />);
    expect(getByText(NOT_AVAILABLE)).toBeInTheDocument();
  });
  it('should not return any errors when all data is ok', async () => {
    spyOsquery({ agentData: { status: 'online' } });
    mockKibana(properPermissions);

    const { queryByText } = renderWithContext(
      <OsqueryAction agentId={'test'} formType={'steps'} />
    );
    expect(queryByText(EMPTY_PROMPT)).not.toBeInTheDocument();
    expect(queryByText(PERMISSION_DENIED)).not.toBeInTheDocument();
    expect(queryByText(AGENT_STATUS_ERROR)).not.toBeInTheDocument();
  });

  // Covers the osquery-owned surface of the Infra "Infrastructure → Host details
  // → Osquery" tab embed (osquery.tsx renders <OsqueryAction agentId hideAgentsField
  // formType="simple" />). The `formType: 'simple'` branch was previously untested;
  // every existing case above exercises `formType: 'steps'` only. These cases
  // verify (a) the prompt / error paths still fire in simple mode and (b) the
  // happy path hands the embedder's props through to LiveQuery unchanged.
  describe('formType: simple (Infra embed)', () => {
    it('renders the empty prompt when the agent is fetched but no agent data is returned', () => {
      spyOsquery();
      mockKibana();

      const { getByText, queryByTestId } = renderWithContext(
        <OsqueryAction agentId={'test'} formType={'simple'} hideAgentsField />
      );

      expect(getByText(EMPTY_PROMPT)).toBeInTheDocument();
      expect(queryByTestId('live-query-mock')).not.toBeInTheDocument();
    });

    it('renders the agent-status error when permissions are ok but the agent is not online', () => {
      spyOsquery({ agentData: { status: 'offline' } });
      mockKibana(properPermissions);

      const { getByText, queryByTestId } = renderWithContext(
        <OsqueryAction agentId={'test'} formType={'simple'} hideAgentsField />
      );

      expect(getByText(AGENT_STATUS_ERROR)).toBeInTheDocument();
      expect(queryByTestId('live-query-mock')).not.toBeInTheDocument();
    });

    it('renders the not-available prompt when osquery is not installed on the policy', () => {
      spyOsquery({ agentData: { status: 'online' }, osqueryAvailable: false });
      mockKibana(properPermissions);

      const { getByText, queryByTestId } = renderWithContext(
        <OsqueryAction agentId={'test'} formType={'simple'} hideAgentsField />
      );

      expect(getByText(NOT_AVAILABLE)).toBeInTheDocument();
      expect(queryByTestId('live-query-mock')).not.toBeInTheDocument();
    });

    it('passes formType="simple" + hideAgentsField through to LiveQuery on the happy path', () => {
      spyOsquery({ agentData: { status: 'online' } });
      mockKibana(properPermissions);

      const { getByTestId } = renderWithContext(
        <OsqueryAction agentId={'agent-42'} formType={'simple'} hideAgentsField />
      );

      const liveQuery = getByTestId('live-query-mock');
      expect(liveQuery).toBeInTheDocument();
      expect(liveQuery).toHaveAttribute('data-form-type', 'simple');
      expect(liveQuery).toHaveAttribute('data-hide-agents-field', 'true');
      expect(liveQuery).toHaveAttribute('data-agent-id', 'agent-42');
    });

    it('does not hide the agent selector when hideAgentsField is not set, even in simple mode', () => {
      spyOsquery({ agentData: { status: 'online' } });
      mockKibana(properPermissions);

      const { getByTestId } = renderWithContext(
        <OsqueryAction agentId={'agent-42'} formType={'simple'} />
      );

      expect(getByTestId('live-query-mock')).toHaveAttribute('data-hide-agents-field', '');
    });

    it('renders permission denied in simple mode when the user lacks all osquery privileges', () => {
      spyOsquery({ agentData: { status: 'online' } });
      mockKibana();

      const { getByText, queryByTestId } = renderWithContext(
        <OsqueryAction agentId={'test'} formType={'simple'} hideAgentsField />
      );

      expect(getByText(PERMISSION_DENIED)).toBeInTheDocument();
      expect(queryByTestId('live-query-mock')).not.toBeInTheDocument();
    });
  });
});
