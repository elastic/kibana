/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { Container } from 'inversify';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiButton } from '@elastic/eui';
import { Context, CoreStart } from '@kbn/core-di-browser';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type {
  CreateImportResponse,
  FindImportsResponse,
  ImportResponse,
  ImportStatsItem,
  ImportStatsResponse,
} from '@kbn/alerting-v2-schemas';
import { LocatorProvider } from '../../application/locator_context';
import { CustomImportSetupFlyout } from '../../components/imports/custom_import_setup_flyout';
import { ImportsApi } from '../../services/imports_api';
import { UserCapabilities } from '../../services/user_capabilities';
import { createStoryLocators } from '../../test_utils/story_locators';
import { ImportsTable } from './components/imports_table';

const NOW = Date.now();
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60 * 1000).toISOString();
const ACTOR = { profile_uid: 'u_story' };

const createImport = (
  overrides: Partial<ImportResponse> & Pick<ImportResponse, 'id' | 'name'>
) => ({
  kind: 'custom' as const,
  enabled: true,
  source: overrides.id,
  connector_id: `connector-${overrides.id}`,
  workflow_id: `workflow-${overrides.id}`,
  tags: [],
  routing_tags: [],
  default_severity: 'medium',
  created_by: ACTOR,
  created_at: minutesAgo(600),
  updated_by: ACTOR,
  updated_at: minutesAgo(30),
  ...overrides,
});

const STORY_IMPORTS: ImportResponse[] = [
  createImport({
    id: 'datadog-monitors',
    name: 'Datadog monitors',
    description: 'Monitor alerts forwarded by a Datadog webhook.',
    tags: ['datadog', 'production'],
    fingerprint_field: 'monitor_id',
    owner: 'Platform team',
  }),
  createImport({ id: 'nagios', name: 'Nagios', tags: ['legacy'] }),
  createImport({ id: 'pager-bridge', name: 'Pager bridge' }),
  createImport({ id: 'staging-hooks', name: 'Staging hooks', enabled: false }),
  createImport({ id: 'broken-hooks', name: 'Broken hooks' }),
];

const createStats = (id: string, overrides: Partial<ImportStatsItem> = {}): ImportStatsItem => ({
  id,
  status: 'receiving',
  alert_series_count: 0,
  last_alert_at: null,
  connector_exists: true,
  receiving_events: true,
  workflow_exists: true,
  workflow_enabled: true,
  last_execution: null,
  ...overrides,
});

const STORY_STATS: ImportStatsItem[] = [
  createStats('datadog-monitors', {
    alert_series_count: 14,
    last_alert_at: minutesAgo(3),
    last_execution: {
      status: 'completed',
      started_at: minutesAgo(3),
      finished_at: minutesAgo(3),
    },
  }),
  createStats('nagios', {
    status: 'idle',
    alert_series_count: 6,
    last_alert_at: minutesAgo(60 * 50),
    last_execution: {
      status: 'completed',
      started_at: minutesAgo(60 * 50),
      finished_at: minutesAgo(60 * 50),
    },
  }),
  createStats('pager-bridge', { status: 'waiting' }),
  createStats('staging-hooks', { status: 'disabled', workflow_enabled: false }),
  createStats('broken-hooks', {
    status: 'failing',
    alert_series_count: 1,
    last_alert_at: minutesAgo(120),
    last_execution: {
      status: 'failed',
      started_at: minutesAgo(10),
      finished_at: minutesAgo(10),
    },
  }),
];

const createMockApi = (imports: ImportResponse[], stats: ImportStatsItem[]) => ({
  listImports: async (): Promise<FindImportsResponse> => ({
    items: imports,
    total: imports.length,
    page: 1,
    per_page: 100,
  }),
  getImportStats: async (): Promise<ImportStatsResponse> => ({ items: stats }),
  createImport: async (): Promise<CreateImportResponse> => ({
    import: createImport({
      id: 'new-import',
      name: 'New import',
      fingerprint_field: 'monitor_id',
    }),
    url: 'https://kibana.example.com/api/actions/events/.inboundWebhook/connector-new-import',
    credentials: {
      url: 'https://kibana.example.com/api/actions/events/.inboundWebhook/connector-new-import',
      token: 'story-token-shown-once',
    },
    public_base_url_configured: true,
  }),
  updateImport: async () => imports[0],
  deleteImport: async () => undefined,
  rotateImportToken: async () => ({
    credentials: { url: 'https://kibana.example.com/hook', token: 'rotated-token' },
    public_base_url_configured: true,
  }),
  testImport: async () => ({ execution_id: 'execution-1', payload: {} }),
});

const StoryEnvironment = ({
  imports,
  stats,
  children,
}: {
  imports: ImportResponse[];
  stats: ImportStatsItem[];
  children: React.ReactNode;
}) => {
  const container = useMemo(() => {
    const storyContainer = new Container();
    storyContainer.bind<unknown>(ImportsApi).toConstantValue(createMockApi(imports, stats));
    storyContainer.bind<unknown>(UserCapabilities).toConstantValue({
      canWrite: () => true,
      canRead: () => true,
    });
    storyContainer.bind<unknown>(CoreStart('notifications')).toConstantValue({
      toasts: {
        addSuccess: action('toast success'),
        addDanger: action('toast danger'),
        addError: action('toast error'),
      },
    });
    storyContainer.bind<unknown>(CoreStart('settings')).toConstantValue({
      client: { get: () => 'MMM D, YYYY @ HH:mm:ss.SSS' },
    });
    storyContainer.bind<unknown>(CoreStart('application')).toConstantValue({
      navigateToApp: action('navigateToApp'),
    });
    storyContainer.bind<unknown>(CoreStart('userProfile')).toConstantValue({
      getCurrent: async () => ({ user: { username: 'elastic', full_name: 'Story User' } }),
    });
    return storyContainer;
  }, [imports, stats]);
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
  );
  const locators = useMemo(() => createStoryLocators(action), []);

  return (
    <I18nProvider>
      <Context.Provider value={container}>
        <QueryClientProvider client={queryClient}>
          <LocatorProvider locators={locators}>{children}</LocatorProvider>
        </QueryClientProvider>
      </Context.Provider>
    </I18nProvider>
  );
};

const ImportsTableStory = ({
  imports,
  stats,
}: {
  imports: ImportResponse[];
  stats: ImportStatsItem[];
}) => (
  <StoryEnvironment imports={imports} stats={stats}>
    <ImportsTable />
  </StoryEnvironment>
);

const SetupFlyoutStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <StoryEnvironment imports={[]} stats={[]}>
      {isOpen ? (
        <CustomImportSetupFlyout onClose={() => setIsOpen(false)} onCreated={action('created')} />
      ) : (
        <EuiButton fill onClick={() => setIsOpen(true)}>
          Open setup flyout
        </EuiButton>
      )}
    </StoryEnvironment>
  );
};

const meta: Meta<typeof ImportsTableStory> = {
  title: 'Alerting V2/Import alerts/Imports page',
  component: ImportsTableStory,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof ImportsTableStory>;

export const WithImports: Story = {
  args: { imports: STORY_IMPORTS, stats: STORY_STATS },
};

export const Empty: Story = {
  args: { imports: [], stats: [] },
};

export const SetupFlyout: StoryObj<typeof SetupFlyoutStory> = {
  render: () => <SetupFlyoutStory />,
};
