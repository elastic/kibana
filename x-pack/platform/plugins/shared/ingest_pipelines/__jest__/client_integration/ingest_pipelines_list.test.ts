/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '../../common/constants';
import type { Pipeline } from '../../common/types';

import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { Route, Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';

import { PipelinesList } from '../../public/application/sections/pipelines_list';
import { getListPath, ROUTES } from '../../public/application/services/navigation';
import { setupEnvironment, WithAppDependencies } from './helpers/setup_environment';

type TestHttpSetup = ReturnType<typeof setupEnvironment>['httpSetup'];

const renderPipelinesList = async (
  httpSetup: TestHttpSetup,
  queryParams: string = '',
  options: { expectedTestId?: string } = {}
) => {
  const history = createMemoryHistory({
    initialEntries: [`${getListPath()}${queryParams}`],
  });

  const Wrapped = WithAppDependencies(PipelinesList, httpSetup);

  render(
    React.createElement(
      Router,
      { history },
      React.createElement(Route, { path: ROUTES.list, component: Wrapped })
    )
  );

  // Mount-time request boundary: wait until the initial load request completes.
  await waitFor(() => expect(httpSetup.get).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByTestId('sectionLoading')).toBeNull());

  if (options.expectedTestId) {
    await screen.findByTestId(options.expectedTestId);
  }

  if (options.expectedTestId === 'pipelinesTable') {
    // Mount-time request boundary: wait until table rows are rendered.
    await waitFor(() =>
      expect(screen.getAllByTestId('pipelineTableRow').length).toBeGreaterThan(0)
    );
  }
};

const getPipelineTableRows = () => {
  const table = screen.getByTestId('pipelinesTable');
  const rows = within(table).getAllByRole('row');
  // Skip header row.
  return rows.slice(1);
};

const getPipelineRowByName = (pipelineName: string) => {
  const buttons = screen.getAllByTestId('pipelineDetailsLink');
  const button = buttons.find((el) => (el.textContent ?? '').trim() === pipelineName);
  const row = button?.closest('tr');
  if (!row) throw new Error(`Could not find table row for "${pipelineName}"`);
  return row;
};

const getTableCellsText = (row: HTMLElement) => {
  const cells = within(row).getAllByRole('cell');
  return cells.map((cell) => {
    const normalized = (cell.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (normalized === 'Edit Delete') return 'EditDelete';
    return normalized;
  });
};

describe('<PipelinesList />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('With pipelines', () => {
    const pipeline1 = {
      name: 'test_pipeline1',
      description: 'test_pipeline1 description',
      processors: [],
    };

    const pipeline2 = {
      name: 'test_pipeline2',
      description: 'test_pipeline2 description',
      processors: [],
    };

    const pipeline3 = {
      name: 'test_pipeline3',
      description: 'test_pipeline3 description',
      processors: [
        {
          script: {
            lang: 'painless',
            source: `String[] envSplit = ctx['env'].splitOnToken(params['delimiter']);\nArrayList tags = new ArrayList();\ntags.add(envSplit[params['position']].trim());\nctx['tags'] = tags;`,
            params: {
              delimiter: '-',
              position: 1,
            },
          },
        },
        {
          pipeline: {
            name: 'test_pipeline2',
          },
        },
      ],
      deprecated: true,
    };

    const pipelines = [pipeline1, pipeline2, pipeline3] as Pipeline[];

    test('should render the list view', async () => {
      httpRequestsMockHelpers.setLoadPipelinesResponse(pipelines);
      await renderPipelinesList(httpSetup, '', { expectedTestId: 'pipelinesTable' });

      // Verify app title
      expect(screen.getByTestId('appTitle')).toHaveTextContent('Ingest pipelines');

      // Verify documentation link
      expect(screen.getByTestId('documentationLink')).toHaveTextContent('Documentation');

      // Verify create dropdown exists
      expect(screen.getByTestId('createPipelineDropdown')).toBeInTheDocument();

      // Verify table content
      const rows = getPipelineTableRows();
      // Deprecated pipelines are hidden by default.
      expect(rows).toHaveLength(2);
      expect(getTableCellsText(rows[0])).toEqual([
        '',
        pipeline1.name,
        '',
        pipeline1.description,
        '0',
        'EditDelete',
      ]);
      expect(getTableCellsText(rows[1])).toEqual([
        '',
        pipeline2.name,
        '',
        pipeline2.description,
        '0',
        'EditDelete',
      ]);
    });

    test('deprecated pipelines are hidden by default', async () => {
      httpRequestsMockHelpers.setLoadPipelinesResponse(pipelines);
      await renderPipelinesList(httpSetup, '', { expectedTestId: 'pipelinesTable' });

      // Table shouldn't show any deprecated pipelines by default
      expect(getPipelineTableRows()).toHaveLength(2);
      expect(screen.queryByText(pipeline3.name)).toBeNull();

      // Enable filtering by deprecated pipelines via the Filters popover
      fireEvent.click(screen.getByTestId('filtersDropdown'));
      const listbox = await screen.findByRole('listbox');
      const deprecatedLabel = within(listbox).getByText('Deprecated');
      fireEvent.click(deprecatedLabel.closest('[role="option"]') ?? deprecatedLabel);

      // First click moves from "off" -> "unset" (show all, including deprecated).
      await waitFor(() => expect(getPipelineTableRows()).toHaveLength(3));

      // Second click moves from "unset" -> "on" (show only deprecated).
      if (screen.queryByRole('listbox') === null) {
        fireEvent.click(screen.getByTestId('filtersDropdown'));
      }
      const listbox2 = await screen.findByRole('listbox');
      const deprecatedLabel2 = within(listbox2).getByText('Deprecated');
      fireEvent.click(deprecatedLabel2.closest('[role="option"]') ?? deprecatedLabel2);

      await waitFor(() => expect(getPipelineTableRows()).toHaveLength(1));
      expect(getTableCellsText(getPipelineTableRows()[0])[1]).toBe(pipeline3.name);
    });

    test('should reload the pipeline data', async () => {
      httpRequestsMockHelpers.setLoadPipelinesResponse(pipelines);
      await renderPipelinesList(httpSetup, '', { expectedTestId: 'pipelinesTable' });
      // Wait for the reload request to fully resolve (prevents act warnings from use_request).
      const getCallsBeforeReload = httpSetup.get.mock.calls.length;
      fireEvent.click(screen.getByTestId('reloadButton'));
      await waitFor(() =>
        expect(httpSetup.get.mock.calls.length).toBeGreaterThan(getCallsBeforeReload)
      );
      const reloadRequest = httpSetup.get.mock.results[getCallsBeforeReload]?.value as
        | Promise<unknown>
        | undefined;
      expect(reloadRequest).toBeDefined();
      await waitFor(async () => {
        await reloadRequest;
      });

      expect(httpSetup.get).toHaveBeenLastCalledWith(API_BASE_PATH, expect.anything());
    });

    test('should delete a pipeline', async () => {
      const { name: pipelineName } = pipeline1;

      httpRequestsMockHelpers.setLoadPipelinesResponse(pipelines);
      httpRequestsMockHelpers.setDeletePipelineResponse(pipelineName, {
        itemsDeleted: [pipelineName],
        errors: [],
      });

      await renderPipelinesList(httpSetup, '', { expectedTestId: 'pipelinesTable' });

      // Select the row and use the bulk-delete button (stable entry point).
      const row = getPipelineRowByName(pipelineName);
      fireEvent.click(within(row).getByRole('checkbox'));
      fireEvent.click(await screen.findByTestId('deletePipelinesButton'));

      const modal = await screen.findByTestId('deletePipelinesConfirmation');
      expect(modal).toHaveTextContent('Delete pipeline');
      fireEvent.click(within(modal).getByTestId('confirmModalConfirmButton'));
      await waitForElementToBeRemoved(modal);

      expect(httpSetup.delete).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/${pipelineName}`,
        expect.anything()
      );
    });

    describe('Pipeline flyout', () => {
      test('should show the details of a pipeline', async () => {
        const { name: pipelineName } = pipeline1;
        httpRequestsMockHelpers.setLoadPipelinesResponse(pipelines);
        httpRequestsMockHelpers.setLoadPipelineResponse(pipelineName, pipeline1);
        await renderPipelinesList(httpSetup, '', { expectedTestId: 'pipelinesTable' });

        fireEvent.click(
          within(getPipelineRowByName(pipelineName)).getByTestId('pipelineDetailsLink')
        );
        expect(screen.getByTestId('pipelinesTable')).toBeInTheDocument();
        expect(screen.getByTestId('pipelineDetails')).toBeInTheDocument();
        expect(await screen.findByTestId('detailsPanelTitle')).toHaveTextContent(pipelineName);
      });

      test('should show load details of a pipeline if added to the url', async () => {
        const { name: pipelineName } = pipeline1;

        httpRequestsMockHelpers.setLoadPipelinesResponse(pipelines);
        httpRequestsMockHelpers.setLoadPipelineResponse(pipelineName, pipeline1);
        await renderPipelinesList(httpSetup, `?pipeline=${pipelineName}`, {
          expectedTestId: 'pipelinesTable',
        });

        expect(screen.getByTestId('pipelinesTable')).toBeInTheDocument();
        expect(screen.getByTestId('pipelineDetails')).toBeInTheDocument();
        expect(await screen.findByTestId('detailsPanelTitle')).toHaveTextContent(pipelineName);
      });

      test('replaces newline characters for spaces in flyout for json blocks', async () => {
        httpRequestsMockHelpers.setLoadPipelinesResponse(pipelines);
        httpRequestsMockHelpers.setLoadPipelineResponse(pipeline2.name, pipeline2);
        await renderPipelinesList(httpSetup, '', { expectedTestId: 'pipelinesTable' });

        fireEvent.click(
          within(getPipelineRowByName(pipeline2.name)).getByTestId('pipelineDetailsLink')
        );
        expect((await screen.findByTestId('jsonCodeBlock')).textContent).not.toContain('\n');
      });

      describe('Error panel', () => {
        const error = {
          statusCode: 404,
          message: 'Not Found',
          error: 'Not Found',
        };
        test('should render an error message flyout if error fetching pipeline', async () => {
          const nonExistingPipeline = 'nonExistingPipeline';

          httpRequestsMockHelpers.setLoadPipelineResponse(nonExistingPipeline, {}, error);
          httpRequestsMockHelpers.setLoadPipelinesResponse(pipelines);
          await renderPipelinesList(httpSetup, `?pipeline=${nonExistingPipeline}`, {
            expectedTestId: 'pipelinesTable',
          });

          expect(screen.getByTestId('pipelinesTable')).toBeInTheDocument();
          const flyout = await screen.findByTestId('pipelineErrorFlyout');
          expect(within(flyout).getByTestId('title')).toHaveTextContent(nonExistingPipeline);
          const errorCallout = screen.getByTestId('pipelineError');
          expect(within(errorCallout).getByTestId('cause')).toHaveTextContent('Not Found');
        });

        test('should render a create pipeline warning if @custom pipeline does not exist', async () => {
          const customPipeline = 'pipeline@custom';

          httpRequestsMockHelpers.setLoadPipelineResponse(customPipeline, {}, error);
          httpRequestsMockHelpers.setLoadPipelinesResponse(pipelines);
          await renderPipelinesList(httpSetup, `?pipeline=${customPipeline}`, {
            expectedTestId: 'pipelinesTable',
          });

          expect(screen.getByTestId('pipelinesTable')).toBeInTheDocument();
          const flyout = await screen.findByTestId('pipelineErrorFlyout');
          expect(within(flyout).getByTestId('title')).toHaveTextContent(customPipeline);
          expect(screen.getByTestId('missingCustomPipeline')).toBeInTheDocument();
          expect(screen.getByTestId('createCustomPipeline')).toBeInTheDocument();
        });
      });

      describe('Tree panel', () => {
        test('should not display structure tree panel if pipeline has no Pipeline processors', async () => {
          const { name: pipelineName } = pipeline1;

          httpRequestsMockHelpers.setLoadPipelineResponse(pipelineName, pipeline1);
          httpRequestsMockHelpers.setLoadPipelinesResponse(pipelines);
          httpRequestsMockHelpers.setLoadPipelineTreeResponse(pipelineName, {
            pipelineStructureTree: {
              pipelineName,
              isManaged: false,
              isDeprecated: false,
              children: [],
            },
          });
          await renderPipelinesList(httpSetup, `?pipeline=${pipelineName}`, {
            expectedTestId: 'pipelinesTable',
          });

          expect(screen.getByTestId('pipelinesTable')).toBeInTheDocument();
          expect(screen.getByTestId('pipelineDetails')).toBeInTheDocument();
          expect(screen.queryByTestId('pipelineTreePanel')).toBeNull();
        });

        test('should display structure tree panel if pipeline has Pipeline processors', async () => {
          const { name: pipelineName } = pipeline3;

          httpRequestsMockHelpers.setLoadPipelineResponse(pipelineName, pipeline3);
          httpRequestsMockHelpers.setLoadPipelinesResponse(pipelines);
          httpRequestsMockHelpers.setLoadPipelineTreeResponse(pipelineName, {
            pipelineStructureTree: {
              pipelineName,
              isManaged: false,
              isDeprecated: false,
              children: [
                {
                  pipelineName: 'test_pipeline2',
                  isManaged: false,
                  isDeprecated: false,
                  children: [],
                },
              ],
            },
          });
          await renderPipelinesList(httpSetup, `?pipeline=${pipelineName}`, {
            expectedTestId: 'pipelinesTable',
          });

          expect(screen.getByTestId('pipelinesTable')).toBeInTheDocument();
          expect(screen.getByTestId('pipelineDetails')).toBeInTheDocument();
          expect(screen.getByTestId('pipelineTreePanel')).toBeInTheDocument();
        });
      });
    });
  });

  describe('No pipelines', () => {
    test('should display an empty prompt', async () => {
      httpRequestsMockHelpers.setLoadPipelinesResponse([]);
      await renderPipelinesList(httpSetup, '', { expectedTestId: 'emptyList' });

      expect(screen.queryByTestId('sectionLoading')).toBeNull();
      const emptyList = screen.getByTestId('emptyList');
      expect(within(emptyList).getByTestId('title')).toHaveTextContent(
        'Create your first pipeline'
      );
    });
  });

  describe('Error handling', () => {
    test('should render an error message if error fetching pipelines', async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setLoadPipelinesResponse(undefined, error);
      await renderPipelinesList(httpSetup, '', { expectedTestId: 'pipelineLoadError' });

      expect(screen.getByTestId('pipelineLoadError')).toHaveTextContent('Unable to load pipelines');
    });
  });
});
