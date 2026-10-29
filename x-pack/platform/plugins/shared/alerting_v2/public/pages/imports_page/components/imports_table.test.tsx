/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ImportResponse, ImportStatsItem } from '@kbn/alerting-v2-schemas';
import {
  createMockLocators,
  createTestQueryClient,
  ListPageTestProviders,
} from '../../../test_utils/test_providers';
import { toImportContentListItem } from '../imports_data_source';
import { ImportsTable } from './imports_table';

const mockLocators = createMockLocators();
const mockFindItems = jest.fn();
const mockSetEnabled = jest.fn();
const mockDeleteImport = jest.fn();
let mockCapabilities: Record<string, Record<string, boolean>> = {
  alerting_v2_rules: { read: true, all: true },
};

jest.mock('@kbn/core-di-browser', () => {
  const { UserCapabilities: ActualUserCapabilities } = jest.requireActual(
    '../../../services/user_capabilities'
  );
  return {
    useService: (token: unknown) => {
      if (token === ActualUserCapabilities) {
        return new ActualUserCapabilities({ capabilities: mockCapabilities });
      }
      if (token === 'chrome') {
        return { docTitle: { change: jest.fn() } };
      }
      if (token === 'settings') {
        return { client: { get: () => 'YYYY-MM-DD HH:mm' } };
      }
      return {};
    },
    CoreStart: (key: string) => key,
  };
});

jest.mock('../imports_data_source', () => ({
  ...jest.requireActual('../imports_data_source'),
  useImportsDataSource: () => ({ findItems: mockFindItems, debounceMs: 0 }),
}));

jest.mock('../../../hooks/use_set_import_enabled', () => ({
  useSetImportEnabled: () => ({
    mutate: mockSetEnabled,
    isLoading: false,
    variables: undefined,
  }),
}));

jest.mock('../../../hooks/use_delete_import', () => ({
  useDeleteImport: () => ({ mutate: mockDeleteImport, isLoading: false }),
}));

jest.mock('../../../hooks/use_import_connector_types', () => ({
  useImportConnectorTypes: () => ({ data: [{ id: '.datadog', name: 'Datadog' }] }),
}));

jest.mock('../../../components/imports/import_setup_flyout', () => ({
  ImportSetupFlyout: ({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) => (
    <div data-test-subj="mockedSetupFlyout">
      <button type="button" onClick={onCreated}>
        created
      </button>
      <button type="button" onClick={onClose}>
        close setup
      </button>
    </div>
  ),
}));

jest.mock('../../../components/imports/import_details_flyout', () => ({
  ImportDetailsFlyout: ({ item }: { item: { import: { id: string } } }) => (
    <div data-test-subj="mockedDetailsFlyout">Details for {item.import.id}</div>
  ),
}));

const createImport = (overrides: Partial<ImportResponse> = {}): ImportResponse => ({
  id: 'import-1',
  name: 'Datadog monitors',
  kind: 'custom',
  enabled: true,
  source: 'datadog-monitors',
  connector_id: 'connector-1',
  workflow_id: 'workflow-1',
  tags: ['prod'],
  routing_tags: [],
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_by: null,
  updated_at: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

const createStats = (overrides: Partial<ImportStatsItem> = {}): ImportStatsItem => ({
  id: 'import-1',
  status: 'receiving',
  alert_series_count: 4,
  last_alert_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  connector_exists: true,
  receiving_events: true,
  workflow_exists: true,
  workflow_enabled: true,
  last_execution: null,
  ...overrides,
});

const mockItems = (...pairs: Array<[ImportResponse, ImportStatsItem | undefined]>) =>
  mockFindItems.mockResolvedValue({
    items: pairs.map(([item, stats]) => toImportContentListItem({ import: item, stats })),
    total: pairs.length,
  });

const renderTable = () =>
  render(
    <ListPageTestProviders locators={mockLocators}>
      <ImportsTable />
    </ListPageTestProviders>
  );

describe('ImportsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapabilities = { alerting_v2_rules: { read: true, all: true } };
  });

  it('shows the empty state with the setup button when there are no imports', async () => {
    mockFindItems.mockResolvedValue({ items: [], total: 0 });
    const user = userEvent.setup();
    renderTable();

    const empty = await screen.findByTestId('importsEmptyState');
    expect(empty).toHaveTextContent('No imports set up yet');
    expect(empty).toHaveTextContent('More vendors are coming');
    expect(screen.getByTestId('importsEmptySetUp')).toHaveTextContent('Set up import');

    await user.click(screen.getByTestId('importsEmptySetUp'));
    expect(screen.getByTestId('mockedSetupFlyout')).toBeInTheDocument();
  });

  it('shows the first import once it is created, when the page opened onto an already-empty list', async () => {
    mockFindItems.mockResolvedValue({ items: [], total: 0 });
    const queryClient = createTestQueryClient();
    const user = userEvent.setup();
    const first = render(
      <ListPageTestProviders locators={mockLocators} queryClient={queryClient}>
        <ImportsTable />
      </ListPageTestProviders>
    );
    await screen.findByTestId('importsEmptyState');
    first.unmount();

    // Coming back to the page, the empty list is already cached, so the list never renders its
    // table content (and anything registered from there) before showing the empty state.
    render(
      <ListPageTestProviders locators={mockLocators} queryClient={queryClient}>
        <ImportsTable />
      </ListPageTestProviders>
    );
    await user.click(await screen.findByTestId('importsEmptySetUp'));
    mockItems([createImport(), createStats()]);
    await user.click(screen.getByText('created'));
    await user.click(screen.getByText('close setup'));

    expect(await screen.findByTestId('importsNameLink-import-1')).toBeInTheDocument();
    expect(screen.queryByTestId('importsEmptyState')).not.toBeInTheDocument();
  });

  it('hides the setup button in the empty state for a read-only user', async () => {
    mockCapabilities = { alerting_v2_rules: { read: true, all: false } };
    mockFindItems.mockResolvedValue({ items: [], total: 0 });
    renderTable();

    await screen.findByTestId('importsEmptyState');
    expect(screen.queryByTestId('importsEmptySetUp')).not.toBeInTheDocument();
  });

  it('renders the columns for each import', async () => {
    mockItems(
      [createImport(), createStats()],
      [
        createImport({ id: 'import-2', name: 'Nagios', tags: [] }),
        createStats({
          id: 'import-2',
          status: 'waiting',
          alert_series_count: 0,
          last_alert_at: null,
        }),
      ]
    );
    renderTable();

    expect(await screen.findByTestId('importsNameLink-import-1')).toHaveTextContent(
      'Datadog monitors'
    );
    expect(screen.getByTestId('importsStatus-receiving')).toHaveTextContent('Receiving');
    expect(screen.getByTestId('importsStatus-waiting')).toHaveTextContent(
      'Waiting for first alert'
    );
    expect(screen.getAllByText('Custom import').length).toBeGreaterThan(0);
    expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getAllByTestId('importsAlertsCount').map((node) => node.textContent)).toEqual([
      '4',
      '0',
    ]);
  });

  it('shows the connector logo and type name for a managed import', async () => {
    mockItems(
      [createImport(), createStats()],
      [
        createImport({
          id: 'dd-1',
          name: 'Datadog (prod)',
          kind: 'managed',
          source: 'datadog',
          connector_id: 'dd-1',
          connector_type_id: '.datadog',
          workflow_id: 'system-datadog-alert-translation',
        }),
        createStats({ id: 'dd-1' }),
      ]
    );
    renderTable();

    await screen.findByTestId('importsNameLink-dd-1');
    expect(screen.getByTestId('importsKindIcon-dd-1')).toBeInTheDocument();
    expect(screen.getAllByTestId('importsKindLabel').map((node) => node.textContent)).toEqual([
      'Custom import',
      'Datadog',
    ]);
  });

  it('shows the POC callout and the Experimental badge', async () => {
    mockItems([createImport(), createStats()]);
    renderTable();

    await screen.findByTestId('importsNameLink-import-1');
    expect(screen.getByTestId('importsPocCallout')).toHaveTextContent(
      "Imported alerts don't trigger action policies yet."
    );
    expect(screen.getByTestId('alertingV2ExperimentalBadge')).toBeInTheDocument();
  });

  it('links the alerts count to the alerts list filtered to the import', async () => {
    mockItems([createImport(), createStats()]);
    const user = userEvent.setup();
    renderTable();

    await user.click(await screen.findByTestId('importsAlertsCount'));

    expect(mockLocators.episodesLocators.navigateSync).toHaveBeenCalledWith({
      filters: { ruleId: 'import-1', status: 'all' },
    });
  });

  it('opens the details flyout from the name link', async () => {
    mockItems([createImport(), createStats()]);
    const user = userEvent.setup();
    renderTable();

    await user.click(await screen.findByTestId('importsNameLink-import-1'));

    expect(screen.getByTestId('mockedDetailsFlyout')).toHaveTextContent('Details for import-1');
  });

  it('opens the setup flyout from the header action', async () => {
    mockItems([createImport(), createStats()]);
    const user = userEvent.setup();
    renderTable();

    await screen.findByTestId('importsNameLink-import-1');
    await user.click(screen.getByTestId('importsSetUpButton'));

    expect(screen.getByTestId('mockedSetupFlyout')).toBeInTheDocument();
  });

  describe('row actions', () => {
    const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(await screen.findByTestId('importsActionsButton-import-1'));
    };

    it('views details', async () => {
      mockItems([createImport(), createStats()]);
      const user = userEvent.setup();
      renderTable();

      await openMenu(user);
      fireEvent.click(screen.getByTestId('importsActionViewDetails'));

      expect(screen.getByTestId('mockedDetailsFlyout')).toBeInTheDocument();
    });

    it('views alerts', async () => {
      mockItems([createImport(), createStats()]);
      const user = userEvent.setup();
      renderTable();

      await openMenu(user);
      fireEvent.click(screen.getByTestId('importsActionViewAlerts'));

      expect(mockLocators.episodesLocators.navigateSync).toHaveBeenCalledWith({
        filters: { ruleId: 'import-1', status: 'all' },
      });
    });

    it('disables an enabled import and refetches', async () => {
      mockItems([createImport(), createStats()]);
      mockSetEnabled.mockImplementation((_vars, options) => options.onSuccess());
      const user = userEvent.setup();
      renderTable();

      await openMenu(user);
      expect(screen.getByTestId('importsActionToggleEnabled')).toHaveTextContent('Disable');
      const callsBefore = mockFindItems.mock.calls.length;
      fireEvent.click(screen.getByTestId('importsActionToggleEnabled'));

      expect(mockSetEnabled).toHaveBeenCalledWith(
        { id: 'import-1', enabled: false },
        expect.any(Object)
      );
      await waitFor(() => expect(mockFindItems.mock.calls.length).toBeGreaterThan(callsBefore));
    });

    it('enables a disabled import', async () => {
      mockItems([createImport({ enabled: false }), createStats({ status: 'disabled' })]);
      const user = userEvent.setup();
      renderTable();

      await openMenu(user);
      expect(screen.getByTestId('importsActionToggleEnabled')).toHaveTextContent('Enable');
      fireEvent.click(screen.getByTestId('importsActionToggleEnabled'));

      expect(mockSetEnabled).toHaveBeenCalledWith(
        { id: 'import-1', enabled: true },
        expect.any(Object)
      );
    });

    it('deletes the import with its connector and workflow after confirming', async () => {
      mockItems([createImport(), createStats()]);
      const user = userEvent.setup();
      renderTable();

      await openMenu(user);
      fireEvent.click(screen.getByTestId('importsActionDelete'));
      const modal = await screen.findByTestId('importsDeleteModal');
      expect(within(modal).getByTestId('importsDeleteResourcesCheckbox')).toBeChecked();
      await user.click(within(modal).getByTestId('confirmModalConfirmButton'));

      expect(mockDeleteImport).toHaveBeenCalledWith(
        { id: 'import-1', deleteResources: true },
        expect.any(Object)
      );
    });

    it('goes back to the empty state after the last import is deleted', async () => {
      mockItems([createImport(), createStats()]);
      mockDeleteImport.mockImplementation((_vars, options) => {
        mockFindItems.mockResolvedValue({ items: [], total: 0 });
        options.onSuccess();
      });
      const user = userEvent.setup();
      renderTable();

      await openMenu(user);
      fireEvent.click(screen.getByTestId('importsActionDelete'));
      const modal = await screen.findByTestId('importsDeleteModal');
      await user.click(within(modal).getByTestId('confirmModalConfirmButton'));

      expect(await screen.findByTestId('importsEmptyState')).toBeInTheDocument();
    });

    it('does not offer to disable a managed import, and leaves the connector out of its delete by default', async () => {
      mockItems([
        createImport({
          id: 'dd-1',
          name: 'Datadog (prod)',
          kind: 'managed',
          source: 'datadog',
          connector_id: 'dd-1',
          connector_type_id: '.datadog',
          workflow_id: 'system-datadog-alert-translation',
        }),
        createStats({ id: 'dd-1' }),
      ]);
      const user = userEvent.setup();
      renderTable();

      await user.click(await screen.findByTestId('importsActionsButton-dd-1'));
      expect(screen.queryByTestId('importsActionToggleEnabled')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('importsActionDelete'));
      const modal = await screen.findByTestId('importsDeleteModal');
      expect(within(modal).getByTestId('importsDeleteResourcesCheckbox')).not.toBeChecked();
      await user.click(within(modal).getByTestId('confirmModalConfirmButton'));

      expect(mockDeleteImport).toHaveBeenCalledWith(
        { id: 'dd-1', deleteResources: false },
        expect.any(Object)
      );
    });

    it('offers no write actions to a read-only user', async () => {
      mockCapabilities = { alerting_v2_rules: { read: true, all: false } };
      mockItems([createImport(), createStats()]);
      const user = userEvent.setup();
      renderTable();

      await openMenu(user);

      expect(screen.getByTestId('importsActionViewDetails')).toBeInTheDocument();
      expect(screen.queryByTestId('importsActionToggleEnabled')).not.toBeInTheDocument();
      expect(screen.queryByTestId('importsActionDelete')).not.toBeInTheDocument();
      expect(screen.queryByTestId('importsSetUpButton')).not.toBeInTheDocument();
    });
  });
});
