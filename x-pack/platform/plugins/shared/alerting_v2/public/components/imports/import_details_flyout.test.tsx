/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ImportResponse, ImportStatsItem } from '@kbn/alerting-v2-schemas';
import { I18nProvider } from '@kbn/i18n-react';
import { createMockLocators, MockLocatorProvider } from '../../test_utils/test_providers';
import type { ImportListItem } from '../../pages/imports_page/imports_data_source';
import { ImportDetailsFlyout } from './import_details_flyout';

const mockNavigateToApp = jest.fn();
const mockRotateToken = jest.fn();
const mockTestImport = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') {
      return { navigateToApp: mockNavigateToApp };
    }
    if (token === 'settings') {
      return { client: { get: () => 'YYYY-MM-DD HH:mm' } };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('../../hooks/use_import_connector_types', () => ({
  useImportConnectorTypes: () => ({ data: [{ id: '.datadog', name: 'Datadog' }] }),
}));

jest.mock('./edit_connector_flyout', () => ({
  EditConnectorFlyout: ({ connectorId }: { connectorId: string }) => (
    <div data-test-subj="mockEditConnectorFlyout">{connectorId}</div>
  ),
}));

jest.mock('../../hooks/use_rotate_import_token', () => ({
  useRotateImportToken: () => ({ mutate: mockRotateToken, isLoading: false }),
}));

jest.mock('../../hooks/use_test_import', () => ({
  useTestImport: () => ({
    mutate: mockTestImport,
    reset: jest.fn(),
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
  }),
}));

const createImport = (overrides: Partial<ImportResponse> = {}): ImportResponse => ({
  id: 'import-1',
  name: 'Datadog monitors',
  description: 'Monitor alerts',
  kind: 'custom',
  enabled: true,
  source: 'datadog-monitors',
  connector_id: 'connector-1',
  workflow_id: 'workflow-1',
  tags: ['prod'],
  routing_tags: ['team-a'],
  default_severity: 'high',
  owner: 'Platform',
  fingerprint_field: 'monitor_id',
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_by: null,
  updated_at: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

const createStats = (overrides: Partial<ImportStatsItem> = {}): ImportStatsItem => ({
  id: 'import-1',
  status: 'receiving',
  alert_series_count: 7,
  last_alert_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  connector_exists: true,
  receiving_events: true,
  workflow_exists: true,
  workflow_enabled: true,
  last_execution: {
    status: 'completed',
    started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    finished_at: null,
  },
  ...overrides,
});

const mockLocators = createMockLocators();

const renderFlyout = (
  item: ImportListItem = { import: createImport(), stats: createStats() },
  canWrite = true
) => {
  const handlers = {
    onClose: jest.fn(),
    onToggleEnabled: jest.fn(),
    onRequestDelete: jest.fn(),
    onRefresh: jest.fn(),
  };
  render(
    <I18nProvider>
      <MockLocatorProvider locators={mockLocators}>
        <ImportDetailsFlyout item={item} canWrite={canWrite} {...handlers} />
      </MockLocatorProvider>
    </I18nProvider>
  );
  return { item, ...handlers };
};

const openTakeActionMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByTestId('importsDetailsTakeActionButton'));
};

describe('ImportDetailsFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the status, the alert count and the configuration', () => {
    renderFlyout();

    expect(screen.getByTestId('importsDetailsStatusBadge')).toHaveTextContent('Receiving');
    expect(screen.getByTestId('importsDetailsAlertsBlock')).toHaveTextContent('7');
    expect(screen.getByTestId('importsDetailsLastAlertBlock')).toHaveTextContent('5 minutes ago');
    expect(screen.getByTestId('importsDetailsLastRunStatus')).toHaveTextContent('completed');
    const configuration = screen.getByTestId('importsDetailsConfiguration');
    expect(configuration).toHaveTextContent('datadog-monitors');
    expect(configuration).toHaveTextContent('High');
    expect(configuration).toHaveTextContent('monitor_id');
    expect(configuration).toHaveTextContent('prod');
    expect(configuration).toHaveTextContent('team-a');
    expect(configuration).toHaveTextContent('Platform');
    expect(configuration).toHaveTextContent('import-1');
    expect(configuration).toHaveTextContent('connector-1');
    expect(configuration).toHaveTextContent('workflow-1');
  });

  it('says it is a custom import', () => {
    renderFlyout();

    expect(screen.getByTestId('importsDetailsKind')).toHaveTextContent('Custom import');
    expect(screen.queryByTestId('importsDetailsEditConnector')).not.toBeInTheDocument();
  });

  it('shows empty values for an import that never received anything', () => {
    renderFlyout({
      import: createImport(),
      stats: createStats({
        status: 'waiting',
        alert_series_count: 0,
        last_alert_at: null,
        last_execution: null,
      }),
    });

    expect(screen.getByTestId('importsDetailsLastAlertBlock')).toHaveTextContent('-');
    expect(screen.getByTestId('importsDetailsLastRun')).toHaveTextContent(
      'The workflow has not run yet.'
    );
  });

  it('opens the workflow in the workflows app', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.click(screen.getByTestId('importsDetailsOpenWorkflow'));

    expect(mockNavigateToApp).toHaveBeenCalledWith('workflows', { path: '/workflow-1' });
  });

  it('opens the alerts list filtered to the import', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.click(screen.getByTestId('importsDetailsViewAlerts'));

    expect(mockLocators.episodesLocators.navigateSync).toHaveBeenCalledWith({
      filters: { ruleId: 'import-1', status: 'all' },
    });
  });

  it('toggles enabled from the header switch', async () => {
    const user = userEvent.setup();
    const { item, onToggleEnabled } = renderFlyout();

    await user.click(screen.getByTestId('importsDetailsEnabledSwitch'));

    expect(onToggleEnabled).toHaveBeenCalledWith(item);
  });

  it('offers Disable import in the action menu for an enabled import and calls toggle', async () => {
    const user = userEvent.setup();
    const { item, onToggleEnabled } = renderFlyout();

    await openTakeActionMenu(user);
    expect(screen.getByTestId('importsDetailsToggleEnabled')).toHaveTextContent('Disable import');
    await user.click(screen.getByTestId('importsDetailsToggleEnabled'));

    expect(onToggleEnabled).toHaveBeenCalledWith(item);
  });

  it('offers Enable import for a disabled import', async () => {
    const user = userEvent.setup();
    renderFlyout({
      import: createImport({ enabled: false }),
      stats: createStats({ status: 'disabled' }),
    });

    await openTakeActionMenu(user);

    expect(screen.getByTestId('importsDetailsToggleEnabled')).toHaveTextContent('Enable import');
  });

  it('asks the host to delete the import', async () => {
    const user = userEvent.setup();
    const { item, onRequestDelete } = renderFlyout();

    await openTakeActionMenu(user);
    fireEvent.click(screen.getByTestId('importsDetailsDelete'));

    expect(onRequestDelete).toHaveBeenCalledWith(item);
  });

  it('rotates the token after confirming and shows the new credentials once', async () => {
    const user = userEvent.setup();
    mockRotateToken.mockImplementation((_id, options) =>
      options.onSuccess({
        credentials: { url: 'https://kibana.test/hook', token: 'new-token' },
        public_base_url_configured: true,
      })
    );
    renderFlyout();

    await openTakeActionMenu(user);
    fireEvent.click(screen.getByTestId('importsDetailsRotateToken'));
    expect(screen.getByTestId('importsRotateModal')).toBeInTheDocument();
    await user.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() =>
      expect(screen.getByTestId('importsDetailsNewCredentials')).toBeInTheDocument()
    );
    expect(mockRotateToken).toHaveBeenCalledWith('import-1', expect.any(Object));
    expect(screen.getByTestId('importsCredentialsToken')).toHaveValue('new-token');
    expect(screen.queryByTestId('importsRotateModal')).not.toBeInTheDocument();
  });

  it('sends a test alert and asks the host to refresh', async () => {
    const user = userEvent.setup();
    mockTestImport.mockImplementation((_id, options) => options.onSuccess());
    const { onRefresh } = renderFlyout();

    await user.click(screen.getByTestId('importsSendTestAlertButton'));

    expect(mockTestImport).toHaveBeenCalledWith('import-1', expect.any(Object));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('disables the test button while the import is disabled', () => {
    renderFlyout({
      import: createImport({ enabled: false }),
      stats: createStats({ status: 'disabled' }),
    });

    expect(screen.getByTestId('importsSendTestAlertButton')).toBeDisabled();
  });

  describe('managed import', () => {
    const managedItem = (stats: Partial<ImportStatsItem> = {}): ImportListItem => ({
      import: createImport({
        id: 'dd-1',
        name: 'Datadog (prod)',
        kind: 'managed',
        source: 'datadog',
        connector_id: 'dd-1',
        connector_type_id: '.datadog',
        workflow_id: 'system-datadog-alert-translation',
        fingerprint_field: undefined,
        default_severity: undefined,
      }),
      stats: createStats({ id: 'dd-1', ...stats }),
    });

    it('shows the connector type instead of Custom import', () => {
      renderFlyout(managedItem());

      expect(screen.getByTestId('importsDetailsKind')).toHaveTextContent('Datadog');
      expect(screen.getByTestId('importsDetailsKindIcon')).toBeInTheDocument();
    });

    it('says the workflow is shared and managed, and leaves out custom-only settings', () => {
      renderFlyout(managedItem());

      const configuration = screen.getByTestId('importsDetailsConfiguration');
      expect(configuration).toHaveTextContent('Shared workflow');
      expect(screen.getByTestId('importsDetailsManagedWorkflowBadge')).toHaveTextContent(
        'Managed, shared'
      );
      expect(configuration).not.toHaveTextContent('Fingerprint field');
      expect(configuration).not.toHaveTextContent('Default severity');
    });

    it('shows whether the connector receives events instead of an enabled switch', () => {
      renderFlyout(managedItem({ receiving_events: false }));

      expect(screen.queryByTestId('importsDetailsEnabledSwitch')).not.toBeInTheDocument();
      expect(screen.getByTestId('importsDetailsReceivingBlock')).toHaveTextContent('Off');
    });

    it('does not offer to disable it, but still offers rotate and delete', async () => {
      const user = userEvent.setup();
      renderFlyout(managedItem());

      await openTakeActionMenu(user);

      expect(screen.queryByTestId('importsDetailsToggleEnabled')).not.toBeInTheDocument();
      expect(screen.getByTestId('importsDetailsRotateToken')).toBeInTheDocument();
      expect(screen.getByTestId('importsDetailsDelete')).toBeInTheDocument();
    });

    it('opens the connector edit flyout', async () => {
      const user = userEvent.setup();
      renderFlyout(managedItem());

      await user.click(screen.getByTestId('importsDetailsEditConnector'));

      expect(screen.getByTestId('mockEditConnectorFlyout')).toHaveTextContent('dd-1');
    });

    it('keeps the test button enabled even when the connector is not receiving', () => {
      renderFlyout(managedItem({ receiving_events: false, status: 'disabled' }));

      expect(screen.getByTestId('importsSendTestAlertButton')).toBeEnabled();
    });
  });

  it('hides the write actions for a read-only user', () => {
    renderFlyout(undefined, false);

    expect(screen.queryByTestId('importsDetailsTakeActionButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('importsDetailsEnabledSwitch')).toBeDisabled();
    expect(screen.getByTestId('importsSendTestAlertButton')).toBeDisabled();
  });
});
