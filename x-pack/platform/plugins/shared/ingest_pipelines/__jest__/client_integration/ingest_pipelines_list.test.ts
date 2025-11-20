/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { API_BASE_PATH } from '../../common/constants';

import { setupEnvironment, pageHelpers } from './helpers';
import type { PipelineListTestBed } from './helpers/pipelines_list.helpers';
import type { Pipeline } from '../../common/types';
import { waitFor } from '@testing-library/dom';

const { setup } = pageHelpers.pipelinesList;

describe('<PipelinesList />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: PipelineListTestBed;

  describe('With pipelines', () => {
    beforeEach(async () => {
      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

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

    httpRequestsMockHelpers.setLoadPipelinesResponse(pipelines);

    test('should render the list view', async () => {
      const { exists, find, table } = testBed;

      // Verify app title
      expect(exists('appTitle')).toBe(true);
      expect(find('appTitle').text()).toEqual('Ingest Pipelines');

      // Verify documentation link
      expect(exists('documentationLink')).toBe(true);
      expect(find('documentationLink').text()).toBe('Documentation');

      // Verify create dropdown exists
      expect(exists('createPipelineDropdown')).toBe(true);

      // Verify table content
      const { tableCellsValues } = table.getMetaData('pipelinesTable');
      tableCellsValues.forEach((row, i) => {
        const pipeline = pipelines[i];

        expect(row).toEqual([
          '',
          pipeline.name,
          '',
          `test_pipeline${i + 1} description`,
          i === 2 ? '2' : '0',
          'EditDelete',
        ]);
      });
    });

    test('deprecated pipelines are hidden by default', async () => {
      const { table, component } = testBed;
      const { tableCellsValues } = table.getMetaData('pipelinesTable');

      // Table should shouldnt show any deprecated pipelines by default
      const pipelinesWithoutDeprecated = pipelines.filter(
        (pipeline: Pipeline) => !pipeline?.deprecated
      );
      expect(tableCellsValues.length).toEqual(pipelinesWithoutDeprecated.length);

      // Enable filtering by deprecated pipelines
      const searchInput = component.find('input.euiFieldSearch').first();
      (searchInput.instance() as unknown as HTMLInputElement).value = 'is:deprecated';
      searchInput.simulate('keyup', { key: 'Enter', keyCode: 13, which: 13 });
      component.update();

      // Table should now show only deprecated pipelines
      const { tableCellsValues: tableCellValuesUpdated } = table.getMetaData('pipelinesTable');
      const pipelinesWithDeprecated = pipelines.filter(
        (pipeline: Pipeline) => pipeline?.deprecated
      );
      expect(tableCellValuesUpdated.length).toEqual(pipelinesWithDeprecated.length);
    });

    test('should reload the pipeline data', async () => {
      const { actions } = testBed;

      await actions.clickReloadButton();

      expect(httpSetup.get).toHaveBeenLastCalledWith(API_BASE_PATH, expect.anything());
    });

    test('should delete a pipeline', async () => {
      const { actions, component } = testBed;
      const { name: pipelineName } = pipeline1;

      httpRequestsMockHelpers.setDeletePipelineResponse(pipelineName, {
        itemsDeleted: [pipelineName],
        errors: [],
      });

      actions.clickPipelineAction(pipelineName, 'delete');

      // We need to read the document "body" as the modal is added there and not inside
      // the component DOM tree.
      const modal = document.body.querySelector('[data-test-subj="deletePipelinesConfirmation"]');
      const confirmButton: HTMLButtonElement | null = modal!.querySelector(
        '[data-test-subj="confirmModalConfirmButton"]'
      );

      expect(modal).not.toBe(null);
      expect(modal!.textContent).toContain('Delete pipeline');

      await act(async () => {
        confirmButton!.click();
      });

      component.update();

      expect(httpSetup.delete).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/${pipelineName}`,
        expect.anything()
      );
    });

    describe('Pipeline flyout', () => {
      beforeEach(async () => {
        await act(async () => {
          testBed = await setup(httpSetup);
        });

        testBed.component.update();
      });

      test('should show the details of a pipeline', async () => {
        const { find, exists, actions, component } = testBed;
        const { name: pipelineName } = pipeline1;
        httpRequestsMockHelpers.setLoadPipelineResponse(pipelineName, pipeline1);

        await act(async () => {
          await actions.clickPipelineAt(0);
        });

        component.update();

        expect(exists('pipelinesTable')).toBe(true);
        expect(exists('pipelineDetails')).toBe(true);

        await waitFor(() => {
          expect(exists('detailsPanelTitle')).toBe(true);
        });

        expect(find('detailsPanelTitle').text()).toBe(pipelineName);
      });

      test('should show load details of a pipeline if added to the url', async () => {
        const { name: pipelineName } = pipeline1;

        httpRequestsMockHelpers.setLoadPipelineResponse(pipelineName, pipeline1);

        await act(async () => {
          testBed = await setup(httpSetup, `?pipeline=${pipelineName}`);
        });

        testBed.component.update();

        const { find, exists } = testBed;

        expect(exists('pipelinesTable')).toBe(true);
        expect(exists('pipelineDetails')).toBe(true);
        expect(find('detailsPanelTitle').text()).toBe(pipelineName);
      });

      test('replaces newline characters for spaces in flyout for json blocks', async () => {
        const { find, actions, component } = testBed;
        httpRequestsMockHelpers.setLoadPipelineResponse(pipeline2.name, pipeline2);

        await act(async () => {
          await actions.clickPipelineAt(1);
        });

        component.update();

        expect(find('jsonCodeBlock').text()).not.toContain(`\n`);
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
          await act(async () => {
            testBed = await setup(httpSetup, `?pipeline=${nonExistingPipeline}`);
          });

          testBed.component.update();

          const { find, exists } = testBed;

          expect(exists('pipelinesTable')).toBe(true);
          expect(exists('pipelineErrorFlyout')).toBe(true);
          expect(find('pipelineErrorFlyout.title').text()).toBe(nonExistingPipeline);
          expect(exists('pipelineError')).toBe(true);
          expect(find('pipelineError.cause').text()).toBe('Not Found');
        });

        test('should render a create pipeline warning if @custom pipeline does not exist', async () => {
          const customPipeline = 'pipeline@custom';

          httpRequestsMockHelpers.setLoadPipelineResponse(customPipeline, {}, error);
          await act(async () => {
            testBed = await setup(httpSetup, `?pipeline=${customPipeline}`);
          });

          testBed.component.update();

          const { find, exists } = testBed;

          expect(exists('pipelinesTable')).toBe(true);
          expect(exists('pipelineErrorFlyout')).toBe(true);
          expect(find('pipelineErrorFlyout.title').text()).toBe(customPipeline);
          expect(exists('missingCustomPipeline')).toBe(true);
          expect(exists('createCustomPipeline')).toBe(true);
        });
      });

      describe('Tree panel', () => {
        test('should not display structure tree panel if pipeline has no Pipeline processors', async () => {
          const { name: pipelineName } = pipeline1;

          httpRequestsMockHelpers.setLoadPipelineResponse(pipelineName, pipeline1);
          httpRequestsMockHelpers.setLoadPipelineTreeResponse(pipelineName, {
            pipelineStructureTree: {
              pipelineName,
              isManaged: false,
              isDeprecated: false,
              children: [],
            },
          });
          await act(async () => {
            testBed = await setup(httpSetup, `?pipeline=${pipelineName}`);
          });

          const { exists, component } = testBed;

          component.update();

          expect(exists('pipelinesTable')).toBe(true);
          expect(exists('pipelineDetails')).toBe(true);
          expect(exists('pipelineTreePanel')).toBe(false);
        });

        test('should display structure tree panel if pipeline has Pipeline processors', async () => {
          const { name: pipelineName } = pipeline3;

          httpRequestsMockHelpers.setLoadPipelineResponse(pipelineName, pipeline3);
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
          await act(async () => {
            testBed = await setup(httpSetup, `?pipeline=${pipelineName}`);
          });

          const { exists, component } = testBed;

          component.update();

          expect(exists('pipelinesTable')).toBe(true);
          expect(exists('pipelineDetails')).toBe(true);
          expect(exists('pipelineTreePanel')).toBe(true);
        });
      });
    });
  });

  describe('No pipelines', () => {
    test('should display an empty prompt', async () => {
      httpRequestsMockHelpers.setLoadPipelinesResponse([]);

      await act(async () => {
        testBed = await setup(httpSetup);
      });
      const { exists, component, find } = testBed;
      component.update();

      expect(exists('sectionLoading')).toBe(false);
      expect(exists('emptyList')).toBe(true);
      expect(find('emptyList.title').text()).toEqual('Create your first pipeline');
    });
  });

  describe('Error handling', () => {
    beforeEach(async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setLoadPipelinesResponse(undefined, error);

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    test('should render an error message if error fetching pipelines', async () => {
      const { exists, find } = testBed;

      expect(exists('pipelineLoadError')).toBe(true);
      expect(find('pipelineLoadError').text()).toContain('Unable to load pipelines');
    });
  });
});
