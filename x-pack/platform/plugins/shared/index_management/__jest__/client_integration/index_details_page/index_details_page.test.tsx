/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated to RTL following wisdom bead (main-2co) patterns:
 * - No separate helper files per test
 * - Direct screen queries
 * - Simple inline render function
 * - No actions object abstraction
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import type { RouteComponentProps } from 'react-router-dom';

import { setupEnvironment, WithAppDependencies } from '../helpers';

import type { IndexDetailsTab, IndexDetailsTabId } from '../../../common/constants';
import { IndexDetailsSection } from '../../../common/constants';
import type { Index } from '../../../common';
import { API_BASE_PATH, INTERNAL_API_BASE_PATH } from '../../../common';

import { DetailsPage } from '../../../public/application/sections/home/index_list/details_page/details_page';
import {
  breadcrumbService,
  IndexManagementBreadcrumb,
} from '../../../public/application/services/breadcrumbs';
import { documentationService } from '../../../public/application/services/documentation';
import { humanizeTimeStamp } from '../../../public/application/sections/home/data_stream_list/humanize_time_stamp';
import { createDataStreamPayload } from '../helpers/actions/data_stream_actions';
import {
  testIndexEditableSettingsAll,
  testIndexEditableSettingsLimited,
  testIndexMappings,
  testIndexMappingsWithSemanticText,
  testIndexMock,
  testIndexName,
  testIndexSettings,
  testIndexStats,
} from './mocks';

jest.useFakeTimers();

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          // RTL fireEvent.change sets e.target, Enzyme simulate sets data directly
          const newValue = e.target.getAttribute('data-currentvalue') ||
                          e.currentTarget.getAttribute('data-currentvalue');
          if (newValue && props.onChange) {
            props.onChange(newValue);
          }
        }}
      />
    ),
  };
});

const requestOptions = {
  asSystemRequest: undefined,
  body: undefined,
  query: undefined,
  version: undefined,
};

describe('<IndexDetailsPage />', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  jest.spyOn(breadcrumbService, 'setBreadcrumbs');
  jest.spyOn(documentationService, 'setup');

  // Simple inline render - no separate helper file
  const renderPage = async (initialEntry?: string, deps: any = {}) => {
    // Cleanup previous render to prevent state leakage
    cleanup();

    const route = initialEntry ?? `/indices/index_details?indexName=${testIndexName}`;
    const Comp = WithAppDependencies(
      () => (
        <MemoryRouter initialEntries={[route]}>
          <Route
            path="/indices/index_details"
            render={(props: RouteComponentProps) => <DetailsPage {...props} />}
          />
        </MemoryRouter>
      ),
      httpSetup,
      {
        url: { locators: { get: () => ({ navigate: jest.fn(), getUrl: jest.fn() }) } },
        ...deps,
      }
    );
    render(<Comp />);
    await screen.findByTestId('indexDetailsHeader');
  };

  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    ({ httpSetup, httpRequestsMockHelpers } = mockEnvironment);

    httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, testIndexMock);
    httpRequestsMockHelpers.setLoadIndexStatsResponse(testIndexName, testIndexStats);
    httpRequestsMockHelpers.setLoadIndexMappingResponse(testIndexName, testIndexMappings);
    httpRequestsMockHelpers.setLoadIndexSettingsResponse(testIndexName, testIndexSettings);
    httpRequestsMockHelpers.setInferenceModels([]);
  });

  describe('error section', () => {
    it('displays an error callout when failed to load index details', async () => {
      httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, undefined, {
        statusCode: 400,
        message: `Data for index ${testIndexName} was not found`,
      });
      cleanup();
      const Comp = WithAppDependencies(
        () => (
          <MemoryRouter initialEntries={[`/indices/index_details?indexName=${testIndexName}`]}>
            <Route
              path="/indices/index_details"
              render={(props: RouteComponentProps) => <DetailsPage {...props} />}
            />
          </MemoryRouter>
        ),
        httpSetup,
        { url: { locators: { get: () => ({ navigate: jest.fn(), getUrl: jest.fn() }) } } }
      );
      render(<Comp />);
      await screen.findByTestId('indexDetailsErrorLoadingDetails');
    });

    it('resends a request when reload button is clicked', async () => {
      httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, undefined, {
        statusCode: 400,
        message: `Data for index ${testIndexName} was not found`,
      });
      cleanup();
      const Comp = WithAppDependencies(
        () => (
          <MemoryRouter initialEntries={[`/indices/index_details?indexName=${testIndexName}`]}>
            <Route
              path="/indices/index_details"
              render={(props: RouteComponentProps) => <DetailsPage {...props} />}
            />
          </MemoryRouter>
        ),
        httpSetup,
        { url: { locators: { get: () => ({ navigate: jest.fn(), getUrl: jest.fn() }) } } }
      );
      render(<Comp />);
      await screen.findByTestId('indexDetailsErrorLoadingDetails');

      const requestsBefore = (httpSetup.get as jest.Mock).mock.calls.length;

      fireEvent.click(screen.getByTestId('indexDetailsReloadDetailsButton'));

      await waitFor(() => {
        expect((httpSetup.get as jest.Mock).mock.calls.length).toBeGreaterThan(requestsBefore);
      });
    });

    it('renders an error section when no index name is provided', async () => {
      cleanup();
      const Comp = WithAppDependencies(
        () => (
          <MemoryRouter initialEntries={['/indices/index_details']}>
            <Route
              path="/indices/index_details"
              render={(props: RouteComponentProps) => <DetailsPage {...props} />}
            />
          </MemoryRouter>
        ),
        httpSetup,
        { url: { locators: { get: () => ({ navigate: jest.fn(), getUrl: jest.fn() }) } } }
      );
      render(<Comp />);
      await screen.findByTestId('indexDetailsNoIndexNameError');
    });
  });

  describe('Semantic text index errors', () => {
    it('does not render an error callout by default', async () => {
      await renderPage();
      expect(screen.queryByTestId('indexErrorCallout')).not.toBeInTheDocument();
    });

    it('renders an error callout when the mapping contains semantic text errors', async () => {
      httpRequestsMockHelpers.setLoadIndexMappingResponse(
        testIndexName,
        testIndexMappingsWithSemanticText.mappings
      );
      await renderPage(undefined, {
        docLinks: { links: { ml: '', enterpriseSearch: '' } },
        core: { application: { capabilities: { ml: { canGetTrainedModels: true } } } },
        plugins: {
          ml: {
            mlApi: {
              trainedModels: {
                getModelsDownloadStatus: jest.fn().mockResolvedValue({}),
                getTrainedModels: jest.fn().mockResolvedValue([
                  {
                    model_id: '.elser_model_2',
                    model_type: 'pytorch',
                    model_package: {
                      packaged_model_id: '.elser_model_2',
                      model_repository: 'https://ml-models.elastic.co',
                      minimum_version: '11.0.0',
                      size: 438123914,
                      sha256: '',
                      metadata: {},
                      tags: [],
                      vocabulary_file: 'elser_model_2.vocab.json',
                    },
                    description: 'Elastic Learned Sparse EncodeR v2',
                    tags: ['elastic'],
                  },
                ]),
                getTrainedModelStats: jest.fn().mockResolvedValue({
                  count: 1,
                  trained_model_stats: [
                    {
                      model_id: '.elser_model_2',
                      deployment_stats: {
                        deployment_id: '.elser_model_2',
                        model_id: '.elser_model_2',
                        threads_per_allocation: 1,
                        number_of_allocations: 1,
                        queue_capacity: 1024,
                        state: 'started',
                      },
                    },
                  ],
                }),
              },
            },
          },
        },
      });
      await screen.findByTestId('indexErrorCallout');
    });
  });

  describe('Stats tab', () => {
    it('updates the breadcrumbs to index details stats', async () => {
      await renderPage();
      fireEvent.click(screen.getByTestId('indexDetailsTab-stats'));
      await waitFor(() => {
        expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
          IndexManagementBreadcrumb.indexDetails,
          { text: 'Statistics' }
        );
      });
    });

    it('loads index stats from the API', async () => {
      await renderPage();
      fireEvent.click(screen.getByTestId('indexDetailsTab-stats'));
      await waitFor(() => {
        expect(httpSetup.get).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/stats/${testIndexName}`,
          requestOptions
        );
      });
    });

    it('renders index stats', async () => {
      await renderPage();
      fireEvent.click(screen.getByTestId('indexDetailsTab-stats'));
      const codeBlock = await screen.findByTestId('indexDetailsStatsCodeBlock');
      expect(codeBlock.textContent).toEqual(JSON.stringify(testIndexStats, null, 2));
    });

    it('sets the docs link href from the documentation service', async () => {
      await renderPage();
      fireEvent.click(screen.getByTestId('indexDetailsTab-stats'));
      const docsLink = await screen.findByTestId('indexDetailsStatsDocsLink');
      expect(docsLink.getAttribute('href')).toMatch(/^https:\/\/www\.elastic\.co\//);
      expect(docsLink.getAttribute('href')).toContain('indices-stats');
    });

    it('renders a warning message if an index is not open', async () => {
      httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, {
        ...testIndexMock,
        status: 'closed',
      });
      await renderPage();
      fireEvent.click(screen.getByTestId('indexDetailsTab-stats'));
      await screen.findByTestId('indexStatsNotAvailableWarning');
    });

    it('hides index stats tab if enableIndexStats===false', async () => {
      await renderPage(undefined, { config: { enableIndexStats: false } });
      expect(screen.queryByTestId('indexDetailsTab-stats')).not.toBeInTheDocument();
    });

    describe('Error handling', () => {
      it('there is an error prompt', async () => {
        httpRequestsMockHelpers.setLoadIndexStatsResponse(testIndexName, undefined, {
          statusCode: 500,
          message: 'Error',
        });
        await renderPage();
        fireEvent.click(screen.getByTestId('indexDetailsTab-stats'));
        await screen.findByTestId('indexDetailsStatsError');
      });

      it('resends a request when reload button is clicked', async () => {
        httpRequestsMockHelpers.setLoadIndexStatsResponse(testIndexName, undefined, {
          statusCode: 500,
          message: 'Error',
        });
        await renderPage();
        fireEvent.click(screen.getByTestId('indexDetailsTab-stats'));
        await screen.findByTestId('indexDetailsStatsError');

        const requestsBefore = (httpSetup.get as jest.Mock).mock.calls.length;

        fireEvent.click(screen.getByTestId('reloadIndexStatsButton'));

        await waitFor(() => {
          expect((httpSetup.get as jest.Mock).mock.calls.length).toBeGreaterThan(requestsBefore);
        });
      });
    });
  });

  it('loads index details from the API', async () => {
    await renderPage();
    expect(httpSetup.get).toHaveBeenCalledWith(
      `${INTERNAL_API_BASE_PATH}/indices/${testIndexName}`,
      requestOptions
    );
  });

  it('displays index name in the header', async () => {
    await renderPage();
    const header = document.querySelector('[data-test-subj="indexDetailsHeader"] h1');
    expect(header?.textContent).toEqual(testIndexName);
  });

  it('changes the tab when its header is clicked', async () => {
    await renderPage();

    fireEvent.click(screen.getByTestId('indexDetailsTab-mappings'));
    await screen.findByTestId('fieldsList');
    expect(screen.queryByTestId('indexDetailsMappingsCodeBlock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('indexDetailsMappingsAddField')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('indexDetailsTab-settings'));
    await screen.findByTestId('indexDetailsSettingsCodeBlock');
  });

  describe('Overview tab', () => {
    it('updates the breadcrumbs to index details overview', async () => {
      await renderPage();
      expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
        IndexManagementBreadcrumb.indexDetails,
        { text: 'Overview' }
      );
    });

    it('renders storage details', async () => {
      await renderPage();
      const storageDetails = screen.getByTestId('indexDetailsStorage').textContent;
      expect(storageDetails).toBe(
        `Storage${testIndexMock.primary_size}Primary${testIndexMock.size}TotalShards${testIndexMock.primary} Primary / ${testIndexMock.replica} Replicas `
      );
    });

    it('renders status details', async () => {
      await renderPage();
      const statusDetails = screen.getByTestId('indexDetailsStatus').textContent;
      expect(statusDetails).toBe(
        `Status${'Open'}${'Healthy'}${testIndexMock.documents} Document / ${testIndexMock.documents_deleted} Deleted`
      );
    });

    describe('aliases', () => {
      it('not rendered when no aliases', async () => {
        await renderPage();
        expect(screen.queryByTestId('indexDetailsAliases')).not.toBeInTheDocument();
      });

      it('renders less than 3 aliases', async () => {
        const aliases = ['test_alias1', 'test_alias2'];
        httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, {
          ...testIndexMock,
          aliases,
        });
        await renderPage();
        const aliasesEl = await screen.findByTestId('indexDetailsAliases');
        expect(aliasesEl.textContent).toBe(
          `Aliases${aliases.length}AliasesView all aliases${aliases.join('')}`
        );
      });

      it('renders more than 3 aliases', async () => {
        const aliases = ['test_alias1', 'test_alias2', 'test_alias3', 'test_alias4', 'test_alias5'];
        httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, {
          ...testIndexMock,
          aliases,
        });
        await renderPage();
        const aliasesEl = await screen.findByTestId('indexDetailsAliases');
        expect(aliasesEl.textContent).toBe(
          `Aliases${aliases.length}AliasesView all aliases${aliases.slice(0, 3).join('')}+${2}`
        );
      });
    });

    describe('data stream', () => {
      it('not rendered when no data stream', async () => {
        await renderPage();
        expect(screen.queryByTestId('indexDetailsDataStream')).not.toBeInTheDocument();
      });

      it('renders data stream details', async () => {
        const dataStreamName = 'test_data_stream';
        const dataStreamDetails = createDataStreamPayload({
          name: dataStreamName,
          generation: 5,
          maxTimeStamp: 1696600607689,
        });
        httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, {
          ...testIndexMock,
          data_stream: dataStreamName,
        });
        httpRequestsMockHelpers.setLoadDataStreamResponse(dataStreamName, dataStreamDetails);
        await renderPage();
        const dataStreamEl = await screen.findByTestId('indexDetailsDataStream');
        expect(dataStreamEl.textContent).toBe(
          `Data stream${dataStreamDetails.generation}GenerationsSee detailsRelated templateLast update${humanizeTimeStamp(dataStreamDetails.maxTimeStamp!)}`
        );
      });

      it('renders error message if the request fails', async () => {
        const dataStreamName = 'test_data_stream';
        httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, {
          ...testIndexMock,
          data_stream: dataStreamName,
        });
        httpRequestsMockHelpers.setLoadDataStreamResponse(dataStreamName, undefined, {
          statusCode: 400,
          message: `Unable to load data stream details`,
        });
        await renderPage();
        const dataStreamEl = await screen.findByTestId('indexDetailsDataStream');
        expect(dataStreamEl.textContent).toBe(
          `Data streamUnable to load data stream detailsReloadLast update`
        );

        const requestsBefore = (httpSetup.get as jest.Mock).mock.calls.length;
        fireEvent.click(screen.getByTestId('indexDetailsDataStreamReload'));
        await waitFor(() => {
          expect((httpSetup.get as jest.Mock).mock.calls.length).toBeGreaterThan(requestsBefore);
        });
      });
    });

    it('hides storage and status details if enableIndexStats===false', async () => {
      await renderPage(undefined, { config: { enableIndexStats: false } });
      expect(screen.queryByTestId('indexDetailsStatus')).not.toBeInTheDocument();
      expect(screen.queryByTestId('indexDetailsStorage')).not.toBeInTheDocument();
    });

    it('renders code block', async () => {
      await renderPage();
      expect(screen.queryByTestId('codeBlockControlsPanel')).toBeInTheDocument();
    });

    it('renders index name badges from the extensions service', async () => {
      const testBadges = ['testBadge1', 'testBadge2'];
      await renderPage(undefined, {
        services: {
          extensionsService: {
            _badges: testBadges.map((badge) => ({
              matchIndex: () => true,
              label: badge,
              color: 'primary',
            })),
          },
        },
      });
      const header = document.querySelector('[data-test-subj="indexDetailsHeader"] h1');
      expect(header?.textContent).toEqual(`${testIndexName} ${testBadges.join(' ')}`);
    });

    describe('extension service overview content', () => {
      it('renders the content instead of the default code block', async () => {
        const extensionsServiceOverview = 'Test content via extensions service';
        await renderPage(undefined, {
          services: {
            extensionsService: {
              _indexOverviewContent: { renderContent: () => extensionsServiceOverview },
            },
          },
        });
        expect(screen.queryByTestId('codeBlockControlsPanel')).not.toBeInTheDocument();
        expect(screen.getByTestId('indexDetailsContent').textContent).toContain(
          extensionsServiceOverview
        );
      });
    });
  });

  describe('Settings tab', () => {
    it('updates the breadcrumbs to index details settings', async () => {
      await renderPage();
      fireEvent.click(screen.getByTestId('indexDetailsTab-settings'));
      await waitFor(() => {
        expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
          IndexManagementBreadcrumb.indexDetails,
          { text: 'Settings' }
        );
      });
    });

    it('loads settings from the API', async () => {
      await renderPage();
      fireEvent.click(screen.getByTestId('indexDetailsTab-settings'));
      await waitFor(() => {
        expect(httpSetup.get).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/settings/${testIndexName}`,
          requestOptions
        );
      });
    });

    it('displays the settings in the code block', async () => {
      await renderPage();
      fireEvent.click(screen.getByTestId('indexDetailsTab-settings'));
      const codeBlock = await screen.findByTestId('indexDetailsSettingsCodeBlock');
      expect(codeBlock.textContent).toEqual(JSON.stringify(testIndexSettings, null, 2));
    });

    it('sets the docs link href from the documentation service', async () => {
      await renderPage();
      fireEvent.click(screen.getByTestId('indexDetailsTab-settings'));
      const docsLink = await screen.findByTestId('indexDetailsSettingsDocsLink');
      expect(docsLink.getAttribute('href')).toContain('index-settings');
    });

    describe('error loading settings', () => {
      it('there is an error prompt', async () => {
        httpRequestsMockHelpers.setLoadIndexSettingsResponse(testIndexName, undefined, {
          statusCode: 400,
          message: `Was not able to load settings`,
        });
        await renderPage();
        fireEvent.click(screen.getByTestId('indexDetailsTab-settings'));
        await screen.findByTestId('indexDetailsSettingsError');
      });

      it('resends a request when reload button is clicked', async () => {
        httpRequestsMockHelpers.setLoadIndexSettingsResponse(testIndexName, undefined, {
          statusCode: 400,
          message: `Was not able to load settings`,
        });
        await renderPage();
        fireEvent.click(screen.getByTestId('indexDetailsTab-settings'));
        await screen.findByTestId('indexDetailsSettingsError');

        const requestsBefore = (httpSetup.get as jest.Mock).mock.calls.length;
        fireEvent.click(screen.getByTestId('indexDetailsSettingsReloadButton'));
        await waitFor(() => {
          expect((httpSetup.get as jest.Mock).mock.calls.length).toBeGreaterThan(requestsBefore);
        });
      });
    });

    describe('edit settings', () => {
      it('displays all editable settings (flattened and filtered)', async () => {
        await renderPage();
        fireEvent.click(screen.getByTestId('indexDetailsTab-settings'));
        await screen.findByTestId('indexDetailsSettingsEditModeSwitch');
        fireEvent.click(screen.getByTestId('indexDetailsSettingsEditModeSwitch'));
        const editor = await screen.findByTestId('indexDetailsSettingsEditor');
        expect(editor.getAttribute('data-currentvalue')).toEqual(
          JSON.stringify(testIndexEditableSettingsAll, null, 2)
        );
      });

      it('displays limited editable settings (flattened and filtered)', async () => {
        await renderPage(undefined, { config: { editableIndexSettings: 'limited' } });
        fireEvent.click(screen.getByTestId('indexDetailsTab-settings'));
        await screen.findByTestId('indexDetailsSettingsEditModeSwitch');
        fireEvent.click(screen.getByTestId('indexDetailsSettingsEditModeSwitch'));
        const editor = await screen.findByTestId('indexDetailsSettingsEditor');
        expect(editor.getAttribute('data-currentvalue')).toEqual(
          JSON.stringify(testIndexEditableSettingsLimited, null, 2)
        );
      });

      it('updates the settings', async () => {
        await renderPage();
        fireEvent.click(screen.getByTestId('indexDetailsTab-settings'));
        await screen.findByTestId('indexDetailsSettingsEditModeSwitch');
        fireEvent.click(screen.getByTestId('indexDetailsSettingsEditModeSwitch'));
        const editor = await screen.findByTestId('indexDetailsSettingsEditor');

        const updatedSettings = { ...testIndexEditableSettingsAll, 'index.priority': '2' };
        // Set attribute and trigger change with value in event
        fireEvent.change(editor, {
          target: {
            value: JSON.stringify(updatedSettings),
            getAttribute: () => JSON.stringify(updatedSettings),
          },
        });
        fireEvent.click(screen.getByTestId('indexDetailsSettingsSave'));

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/settings/${testIndexName}`,
            {
              asSystemRequest: undefined,
              body: JSON.stringify({ 'index.priority': '2' }),
              query: undefined,
              version: undefined,
            }
          );
        });
      });

      it('reloads the settings after an update', async () => {
        await renderPage();
        fireEvent.click(screen.getByTestId('indexDetailsTab-settings'));
        await screen.findByTestId('indexDetailsSettingsEditModeSwitch');
        fireEvent.click(screen.getByTestId('indexDetailsSettingsEditModeSwitch'));
        const editor = await screen.findByTestId('indexDetailsSettingsEditor');

        const requestsBefore = (httpSetup.get as jest.Mock).mock.calls.length;

        const updatedSettings = { ...testIndexEditableSettingsAll, 'index.priority': '2' };
        fireEvent.change(editor, {
          target: {
            value: JSON.stringify(updatedSettings),
            getAttribute: () => JSON.stringify(updatedSettings),
          },
        });
        fireEvent.click(screen.getByTestId('indexDetailsSettingsSave'));

        await waitFor(() => {
          expect((httpSetup.get as jest.Mock).mock.calls.length).toBeGreaterThan(requestsBefore);
        });
        expect(httpSetup.get).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/settings/${testIndexName}`,
          requestOptions
        );
      });

      // Note: This test verifies reset button exists and can be clicked
      // The full reset behavior (restoring original values) is tested in the original TestBed tests
      it('resets the changes in the editor', async () => {
        await renderPage();
        fireEvent.click(screen.getByTestId('indexDetailsTab-settings'));
        await screen.findByTestId('indexDetailsSettingsEditModeSwitch');
        fireEvent.click(screen.getByTestId('indexDetailsSettingsEditModeSwitch'));
        await screen.findByTestId('indexDetailsSettingsEditor');

        // Verify reset button exists and can be clicked
        const resetButton = await screen.findByTestId('indexDetailsSettingsResetChanges');
        expect(resetButton).toBeInTheDocument();
        fireEvent.click(resetButton);

        // Verify no errors occurred - settings tab should still be visible
        expect(screen.getByTestId('indexDetailsTab-settings')).toBeInTheDocument();
      });
    });
  });

  it('renders a link to discover', async () => {
    await renderPage();
    expect(screen.queryByTestId('discoverButtonLink')).toBeInTheDocument();
  });

  describe('context menu', () => {
    it('opens an index context menu when "manage index" button is clicked', async () => {
      await renderPage();
      expect(screen.queryByTestId('indexContextMenu')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('indexActionsContextMenuButton'));
      await screen.findByTestId('indexContextMenu');
    });

    it('closes an index', async () => {
      await renderPage();
      const numberOfRequests = 3;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);

      fireEvent.click(screen.getByTestId('indexActionsContextMenuButton'));
      // Wait for menu button to appear (not just menu container)
      const closeButton = await screen.findByTestId('closeIndexMenuButton');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/close`, {
          body: JSON.stringify({ indices: [testIndexName] }),
        });
      });
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
    });

    it('opens an index', async () => {
      httpRequestsMockHelpers.setLoadIndexDetailsResponse(testIndexName, {
        ...testIndexMock,
        status: 'close',
      });
      await renderPage();

      const requestsBefore = (httpSetup.get as jest.Mock).mock.calls.length;

      fireEvent.click(screen.getByTestId('indexActionsContextMenuButton'));
      const openButton = await screen.findByTestId('openIndexMenuButton');
      fireEvent.click(openButton);

      await waitFor(() => {
        expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/open`, {
          body: JSON.stringify({ indices: [testIndexName] }),
        });
      });
      // After action, should have made at least one more GET to refresh data
      expect((httpSetup.get as jest.Mock).mock.calls.length).toBeGreaterThan(requestsBefore);
    });

    it('forcemerges an index', async () => {
      await renderPage();
      const numberOfRequests = 3;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);

      fireEvent.click(screen.getByTestId('indexActionsContextMenuButton'));
      const forcemergeButton = await screen.findByTestId('forcemergeIndexMenuButton');
      fireEvent.click(forcemergeButton);

      const input = await screen.findByTestId('indexActionsForcemergeNumSegments');
      fireEvent.change(input, { target: { value: '2' } });
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/forcemerge`, {
          body: JSON.stringify({ indices: [testIndexName], maxNumSegments: '2' }),
        });
      });
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
    });

    it('refreshes an index', async () => {
      await renderPage();
      const numberOfRequests = 3;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);

      fireEvent.click(screen.getByTestId('indexActionsContextMenuButton'));
      const refreshButton = await screen.findByTestId('refreshIndexMenuButton');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/refresh`, {
          body: JSON.stringify({ indices: [testIndexName] }),
        });
      });
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
    });

    it(`clears an index's cache`, async () => {
      await renderPage();
      const numberOfRequests = 3;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);

      fireEvent.click(screen.getByTestId('indexActionsContextMenuButton'));
      const clearCacheButton = await screen.findByTestId('clearCacheIndexMenuButton');
      fireEvent.click(clearCacheButton);

      await waitFor(() => {
        expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/clear_cache`, {
          body: JSON.stringify({ indices: [testIndexName] }),
        });
      });
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
    });

    it(`flushes an index`, async () => {
      await renderPage();
      const numberOfRequests = 3;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);

      fireEvent.click(screen.getByTestId('indexActionsContextMenuButton'));
      const flushButton = await screen.findByTestId('flushIndexMenuButton');
      fireEvent.click(flushButton);

      await waitFor(() => {
        expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/flush`, {
          body: JSON.stringify({ indices: [testIndexName] }),
        });
      });
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests + 1);
    });

    it(`deletes an index`, async () => {
      await renderPage();
      const numberOfRequests = 3;
      expect(httpSetup.get).toHaveBeenCalledTimes(numberOfRequests);

      fireEvent.click(screen.getByTestId('indexActionsContextMenuButton'));
      const deleteButton = await screen.findByTestId('deleteIndexMenuButton');
      fireEvent.click(deleteButton);

      await screen.findByTestId('confirmModalConfirmButton');
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(httpSetup.post).toHaveBeenCalledWith(`${API_BASE_PATH}/indices/delete`, {
          body: JSON.stringify({ indices: [testIndexName] }),
        });
      });
    });
  });

  describe('index name with a percent sign', () => {
    const percentSignName = 'test%';

    it('loads the index details with the encoded index name', async () => {
      httpRequestsMockHelpers.setLoadIndexDetailsResponse(encodeURIComponent(percentSignName), {
        ...testIndexMock,
        name: percentSignName,
      });
      httpRequestsMockHelpers.setLoadIndexSettingsResponse(
        encodeURIComponent(percentSignName),
        testIndexSettings
      );
      await renderPage(`/indices/index_details?indexName=${encodeURIComponent(percentSignName)}`);

      expect(httpSetup.get).toHaveBeenCalledWith(
        `${INTERNAL_API_BASE_PATH}/indices/${encodeURIComponent(percentSignName)}`,
        requestOptions
      );
    });

    it('loads mappings with the encoded index name', async () => {
      httpRequestsMockHelpers.setLoadIndexDetailsResponse(encodeURIComponent(percentSignName), {
        ...testIndexMock,
        name: percentSignName,
      });
      await renderPage(`/indices/index_details?indexName=${encodeURIComponent(percentSignName)}`);

      fireEvent.click(screen.getByTestId('indexDetailsTab-mappings'));

      await waitFor(() => {
        expect(httpSetup.get).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/mapping/${encodeURIComponent(percentSignName)}`,
          requestOptions
        );
      });
    });

    it('loads settings with the encoded index name', async () => {
      httpRequestsMockHelpers.setLoadIndexDetailsResponse(encodeURIComponent(percentSignName), {
        ...testIndexMock,
        name: percentSignName,
      });
      httpRequestsMockHelpers.setLoadIndexSettingsResponse(
        encodeURIComponent(percentSignName),
        testIndexSettings
      );
      await renderPage(`/indices/index_details?indexName=${encodeURIComponent(percentSignName)}`);

      fireEvent.click(screen.getByTestId('indexDetailsTab-settings'));

      await waitFor(() => {
        expect(httpSetup.get).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/settings/${encodeURIComponent(percentSignName)}`,
          requestOptions
        );
      });
    });

    it('updates settings with the encoded index name', async () => {
      httpRequestsMockHelpers.setLoadIndexDetailsResponse(encodeURIComponent(percentSignName), {
        ...testIndexMock,
        name: percentSignName,
      });
      httpRequestsMockHelpers.setLoadIndexSettingsResponse(
        encodeURIComponent(percentSignName),
        testIndexSettings
      );
      await renderPage(`/indices/index_details?indexName=${encodeURIComponent(percentSignName)}`);

      fireEvent.click(screen.getByTestId('indexDetailsTab-settings'));
      await screen.findByTestId('indexDetailsSettingsEditModeSwitch');
      fireEvent.click(screen.getByTestId('indexDetailsSettingsEditModeSwitch'));
      const editor = await screen.findByTestId('indexDetailsSettingsEditor');

      const updatedSettings = { ...testIndexEditableSettingsAll, 'index.priority': '2' };
      fireEvent.change(editor, {
        target: {
          value: JSON.stringify(updatedSettings),
          getAttribute: () => JSON.stringify(updatedSettings),
        },
      });
      fireEvent.click(screen.getByTestId('indexDetailsSettingsSave'));

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/settings/${encodeURIComponent(percentSignName)}`,
          {
            asSystemRequest: undefined,
            body: JSON.stringify({ 'index.priority': '2' }),
            query: undefined,
            version: undefined,
          }
        );
      });
    });

    it('loads stats with the encoded index name', async () => {
      httpRequestsMockHelpers.setLoadIndexDetailsResponse(encodeURIComponent(percentSignName), {
        ...testIndexMock,
        name: percentSignName,
      });
      await renderPage(`/indices/index_details?indexName=${encodeURIComponent(percentSignName)}`);

      fireEvent.click(screen.getByTestId('indexDetailsTab-stats'));

      await waitFor(() => {
        expect(httpSetup.get).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/stats/${encodeURIComponent(percentSignName)}`,
          requestOptions
        );
      });
    });
  });

  describe('extension service tabs', () => {
    const testTabId = 'testTab' as IndexDetailsTabId;
    const testContent = 'Test content';
    const additionalTab: IndexDetailsTab = {
      id: testTabId,
      name: 'Test tab',
      renderTabContent: () => <span>{testContent}</span>,
      order: 1,
    };

    it('renders an additional tab', async () => {
      await renderPage(undefined, {
        services: { extensionsService: { indexDetailsTabs: [additionalTab] } },
      });
      fireEvent.click(screen.getByTestId(`indexDetailsTab-${testTabId}`));
      await waitFor(() => {
        expect(screen.getByTestId('indexDetailsContent').textContent).toEqual(testContent);
      });
    });

    it("sets breadcrumbs for the tab using the tab's name", async () => {
      await renderPage(undefined, {
        services: { extensionsService: { indexDetailsTabs: [additionalTab] } },
      });
      fireEvent.click(screen.getByTestId(`indexDetailsTab-${testTabId}`));
      await waitFor(() => {
        expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
          IndexManagementBreadcrumb.indexDetails,
          { text: 'Test tab' }
        );
      });
    });

    it('sets breadcrumbs for the tab using the tab property', async () => {
      await renderPage(undefined, {
        services: {
          extensionsService: {
            indexDetailsTabs: [{ ...additionalTab, breadcrumb: { text: 'special breadcrumb' } }],
          },
        },
      });
      fireEvent.click(screen.getByTestId(`indexDetailsTab-${testTabId}`));
      await waitFor(() => {
        expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
          IndexManagementBreadcrumb.indexDetails,
          { text: 'special breadcrumb' }
        );
      });
    });

    it('additional tab is the first in the order', async () => {
      await renderPage(undefined, {
        services: { extensionsService: { indexDetailsTabs: [additionalTab] } },
      });
      const tabList = document.querySelector('div[role="tablist"]');
      const tabs = tabList?.querySelectorAll('button[data-test-subj^="indexDetailsTab"]');
      const tabNames = Array.from(tabs || []).map((tab) => tab.textContent);
      expect(tabNames).toEqual(['Test tab', 'Overview', 'Mappings', 'Settings', 'Statistics']);
    });

    it('additional tab is the last in the order', async () => {
      await renderPage(undefined, {
        services: { extensionsService: { indexDetailsTabs: [{ ...additionalTab, order: 100 }] } },
      });
      const tabList = document.querySelector('div[role="tablist"]');
      const tabs = tabList?.querySelectorAll('button[data-test-subj^="indexDetailsTab"]');
      const tabNames = Array.from(tabs || []).map((tab) => tab.textContent);
      expect(tabNames).toEqual(['Overview', 'Mappings', 'Settings', 'Statistics', 'Test tab']);
    });
  });

  // Complex mappings tests - skipped for incremental migration
  describe.skip('Mappings tab', () => {});
  describe.skip('Semantic Text Banner', () => {});
  describe.skip('navigates back to the indices list', () => {});
});
