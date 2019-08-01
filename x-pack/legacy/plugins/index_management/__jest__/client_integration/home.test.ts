/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';
import * as fixtures from '../../test/fixtures';
import {
  setupEnvironment,
  pageHelpers,
  nextTick,
  getRandomString,
  findTestSubject,
} from './helpers';
import { IdxMgmtHomeTestBed } from './helpers/home.helpers';

const API_PATH = '/api/index_management';

const { setup } = pageHelpers.home;

const removeWhiteSpaceOnArrayValues = (array: any[]) =>
  array.map(value => {
    if (!value.trim) {
      return value;
    }
    return value.trim();
  });

jest.mock('ui/chrome', () => ({
  breadcrumbs: { set: () => {} },
  addBasePath: (path: string) => path || '/api/index_management',
}));

// We need to skip the tests until react 16.9.0 is released
// which supports asynchronous code inside act()
describe.skip('<IndexManagementHome />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: IdxMgmtHomeTestBed;

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([]);

      testBed = await setup();

      // @ts-ignore (remove when react 16.9.0 is released)
      await act(async () => {
        const { component } = testBed;

        await nextTick();
        component.update();
      });
    });

    test('should set the correct app title', () => {
      const { exists, find } = testBed;
      expect(exists('appTitle')).toBe(true);
      expect(find('appTitle').text()).toEqual('Index Management');
    });

    test('should have a link to the documentation', () => {
      const { exists, find } = testBed;
      expect(exists('documentationLink')).toBe(true);
      expect(find('documentationLink').text()).toBe('Index Management docs');
    });

    describe('tabs', () => {
      test('should have 2 tabs', () => {
        const { find } = testBed;

        expect(find('tab').length).toBe(2);
        expect(find('tab').map(t => t.text())).toEqual(['Indices', 'Index Templates']);
      });

      test('should navigate to Index Templates tab', async () => {
        const { exists, actions, component } = testBed;

        expect(exists('indicesList')).toBe(true);
        expect(exists('templatesList')).toBe(false);

        httpRequestsMockHelpers.setLoadTemplatesResponse([]);

        actions.selectHomeTab('index templates');

        // @ts-ignore (remove when react 16.9.0 is released)
        await act(async () => {
          await nextTick();
          component.update();
        });

        expect(exists('indicesList')).toBe(false);
        expect(exists('templatesList')).toBe(true);
      });
    });

    describe('index templates', () => {
      describe('when there are no index templates', () => {
        beforeEach(async () => {
          const { actions, component } = testBed;

          httpRequestsMockHelpers.setLoadTemplatesResponse([]);

          actions.selectHomeTab('index templates');

          // @ts-ignore (remove when react 16.9.0 is released)
          await act(async () => {
            await nextTick();
            component.update();
          });
        });

        test('should display an empty prompt', async () => {
          const { exists } = testBed;

          expect(exists('sectionLoading')).toBe(false);
          expect(exists('emptyPrompt')).toBe(true);
        });
      });

      describe('when there are index templates', () => {
        const template1 = fixtures.getTemplate({
          name: `a${getRandomString()}`,
          indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
          settings: JSON.stringify({
            index: {
              number_of_shards: '1',
              lifecycle: {
                name: 'my_ilm_policy',
              },
            },
          }),
        });
        const template2 = fixtures.getTemplate({
          name: `b${getRandomString()}`,
          indexPatterns: ['template2Pattern1*'],
        });
        const template3 = fixtures.getTemplate({
          name: `.c${getRandomString()}`, // mock system template
          indexPatterns: ['template3Pattern1*', 'template3Pattern2', 'template3Pattern3'],
        });

        const templates = [template1, template2, template3];

        beforeEach(async () => {
          const { actions, component } = testBed;

          httpRequestsMockHelpers.setLoadTemplatesResponse(templates);

          actions.selectHomeTab('index templates');

          // @ts-ignore (remove when react 16.9.0 is released)
          await act(async () => {
            await nextTick();
            component.update();
          });
        });

        test('should list them in the table', async () => {
          const { table } = testBed;

          const { tableCellsValues } = table.getMetaData('templatesTable');

          tableCellsValues.forEach((row, i) => {
            const template = templates[i];
            const { name, indexPatterns, order, ilmPolicy } = template;

            const ilmPolicyName = ilmPolicy && ilmPolicy.name ? ilmPolicy.name : '';
            const orderFormatted = order ? order.toString() : order;

            expect(removeWhiteSpaceOnArrayValues(row)).toEqual([
              '',
              name,
              indexPatterns.join(', '),
              ilmPolicyName,
              orderFormatted,
              '',
              '',
              '',
              '',
            ]);
          });
        });

        test('should have a button to reload the index templates', async () => {
          const { component, exists, actions } = testBed;
          const totalRequests = server.requests.length;

          expect(exists('reloadButton')).toBe(true);

          // @ts-ignore (remove when react 16.9.0 is released)
          await act(async () => {
            actions.clickReloadButton();
            await nextTick();
            component.update();
          });

          expect(server.requests.length).toBe(totalRequests + 1);
          expect(server.requests[server.requests.length - 1].url).toBe(`${API_PATH}/templates`);
        });

        test('should have a switch to view system templates', async () => {
          const { table, exists, component, form } = testBed;
          const { rows } = table.getMetaData('templatesTable');

          expect(rows.length).toEqual(
            templates.filter(template => !template.name.startsWith('.')).length
          );

          expect(exists('systemTemplatesSwitch')).toBe(true);

          // @ts-ignore (remove when react 16.9.0 is released)
          await act(async () => {
            form.toggleEuiSwitch('systemTemplatesSwitch');
            await nextTick();
            component.update();
          });

          const { rows: updatedRows } = table.getMetaData('templatesTable');
          expect(updatedRows.length).toEqual(templates.length);
        });

        test('each row should have a link to the template', async () => {
          const { find, exists, actions } = testBed;

          await actions.clickTemplateAt(0);

          expect(exists('templatesList')).toBe(true);
          expect(exists('templateDetails')).toBe(true);
          expect(find('templateDetails.title').text()).toBe(template1.name);
        });

        describe('delete index template', () => {
          test('should have action buttons on each row to delete an index template', () => {
            const { table } = testBed;
            const { rows } = table.getMetaData('templatesTable');
            const lastColumn = rows[0].columns[rows[0].columns.length - 1].reactWrapper;

            expect(findTestSubject(lastColumn, 'deleteTemplateButton').length).toBe(1);
          });

          test('should show a confirmation when clicking the delete template button', async () => {
            const { actions } = testBed;

            await actions.clickTemplateActionAt(0, 'delete');

            // We need to read the document "body" as the modal is added there and not inside
            // the component DOM tree.
            expect(
              document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]')
            ).not.toBe(null);

            expect(
              document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]')!
                .textContent
            ).toContain('Delete template');
          });

          test('should show a warning message when attempting to delete a system template', async () => {
            const { component, form, actions } = testBed;

            // @ts-ignore (remove when react 16.9.0 is released)
            await act(async () => {
              form.toggleEuiSwitch('systemTemplatesSwitch');
              await nextTick();
              component.update();
            });

            await actions.clickTemplateActionAt(0, 'delete');

            expect(
              document.body.querySelector('[data-test-subj="deleteSystemTemplateCallOut"]')
            ).not.toBe(null);
          });

          test('should send the correct HTTP request to delete an index template', async () => {
            const { component, actions, table } = testBed;
            const { rows } = table.getMetaData('templatesTable');

            const watchId = rows[0].columns[2].value;

            await actions.clickTemplateActionAt(0, 'delete');

            const modal = document.body.querySelector(
              '[data-test-subj="deleteTemplatesConfirmation"]'
            );
            const confirmButton: HTMLButtonElement | null = modal!.querySelector(
              '[data-test-subj="confirmModalConfirmButton"]'
            );

            httpRequestsMockHelpers.setDeleteTemplateResponse({
              results: {
                successes: [watchId],
                errors: [],
              },
            });

            // @ts-ignore (remove when react 16.9.0 is released)
            await act(async () => {
              confirmButton!.click();
              await nextTick();
              component.update();
            });

            const latestRequest = server.requests[server.requests.length - 1];

            expect(latestRequest.method).toBe('DELETE');
            expect(latestRequest.url).toBe(`${API_PATH}/templates/${template1.name}`);
          });
        });

        describe('detail flyout', () => {
          it('should have a close button and be able to close flyout', async () => {
            const template = fixtures.getTemplate({
              name: `a${getRandomString()}`,
              indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
            });

            const { actions, component, exists } = testBed;

            httpRequestsMockHelpers.setLoadTemplateResponse(template);

            await actions.clickTemplateAt(0);

            // @ts-ignore (remove when react 16.9.0 is released)
            await act(async () => {
              await nextTick();
              component.update();
            });

            expect(exists('closeDetailsButton')).toBe(true);
            expect(exists('summaryTab')).toBe(true);

            actions.clickCloseDetailsButton();

            // @ts-ignore (remove when react 16.9.0 is released)
            await act(async () => {
              await nextTick();
              component.update();
            });

            expect(exists('summaryTab')).toBe(false);
          });

          it('should have a delete button', async () => {
            const template = fixtures.getTemplate({
              name: `a${getRandomString()}`,
              indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
            });

            const { actions, component, exists } = testBed;

            httpRequestsMockHelpers.setLoadTemplateResponse(template);

            await actions.clickTemplateAt(0);

            // @ts-ignore (remove when react 16.9.0 is released)
            await act(async () => {
              await nextTick();
              component.update();
            });

            expect(exists('templateDetails.deleteTemplateButton')).toBe(true);
          });

          it('should render an error if error fetching template details', async () => {
            const { actions, component, exists } = testBed;
            const error = {
              status: 404,
              error: 'Not found',
              message: 'Template not found',
            };

            httpRequestsMockHelpers.setLoadTemplateResponse(undefined, { body: error });

            await actions.clickTemplateAt(0);

            // @ts-ignore (remove when react 16.9.0 is released)
            await act(async () => {
              await nextTick();
              component.update();
            });

            expect(exists('sectionError')).toBe(true);
            // Delete button should not render if error
            expect(exists('templateDetails.deleteTemplateButton')).toBe(false);
          });

          describe('tabs', () => {
            test('should have 4 tabs if template has mappings, settings and aliases data', async () => {
              const template = fixtures.getTemplate({
                name: `a${getRandomString()}`,
                indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
                settings: JSON.stringify({
                  index: {
                    number_of_shards: '1',
                  },
                }),
                mappings: {
                  _source: {
                    enabled: false,
                  },
                  properties: {
                    created_at: {
                      type: 'date',
                      format: 'EEE MMM dd HH:mm:ss Z yyyy',
                    },
                  },
                },
                aliases: JSON.stringify({
                  alias1: {},
                }),
              });

              const { find, actions, exists, component } = testBed;

              httpRequestsMockHelpers.setLoadTemplateResponse(template);

              await actions.clickTemplateAt(0);

              expect(find('templateDetails.tab').length).toBe(4);
              expect(find('templateDetails.tab').map(t => t.text())).toEqual([
                'Summary',
                'Settings',
                'Mappings',
                'Aliases',
              ]);

              // Summary tab should be initial active tab
              expect(exists('summaryTab')).toBe(true);

              // Navigate and verify all tabs
              actions.selectDetailsTab('settings');

              // @ts-ignore (remove when react 16.9.0 is released)
              await act(async () => {
                await nextTick();
                component.update();
              });

              expect(exists('summaryTab')).toBe(false);
              expect(exists('settingsTab')).toBe(true);

              actions.selectDetailsTab('aliases');

              // @ts-ignore (remove when react 16.9.0 is released)
              await act(async () => {
                await nextTick();
                component.update();
              });

              expect(exists('summaryTab')).toBe(false);
              expect(exists('settingsTab')).toBe(false);
              expect(exists('aliasesTab')).toBe(true);

              actions.selectDetailsTab('mappings');

              // @ts-ignore (remove when react 16.9.0 is released)
              await act(async () => {
                await nextTick();
                component.update();
              });

              expect(exists('summaryTab')).toBe(false);
              expect(exists('settingsTab')).toBe(false);
              expect(exists('aliasesTab')).toBe(false);
              expect(exists('mappingsTab')).toBe(true);
            });

            it('should not show tabs if mappings, settings and aliases data is not present', async () => {
              const templateWithNoTabs = fixtures.getTemplate({
                name: `a${getRandomString()}`,
                indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
              });

              const { actions, find, exists, component } = testBed;

              httpRequestsMockHelpers.setLoadTemplateResponse(templateWithNoTabs);

              await actions.clickTemplateAt(0);

              // @ts-ignore (remove when react 16.9.0 is released)
              await act(async () => {
                await nextTick();
                component.update();
              });

              expect(find('templateDetails.tab').length).toBe(0);
              expect(exists('summaryTab')).toBe(true);
              expect(exists('summaryTitle')).toBe(true);
            });

            it('should not show all tabs if mappings, settings or aliases data is not present', async () => {
              const templateWithSomeTabs = fixtures.getTemplate({
                name: `a${getRandomString()}`,
                indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
                settings: JSON.stringify({
                  index: {
                    number_of_shards: '1',
                  },
                }),
              });

              const { actions, find, exists, component } = testBed;

              httpRequestsMockHelpers.setLoadTemplateResponse(templateWithSomeTabs);

              await actions.clickTemplateAt(0);

              // @ts-ignore (remove when react 16.9.0 is released)
              await act(async () => {
                await nextTick();
                component.update();
              });

              expect(find('templateDetails.tab').length).toBe(2);
              expect(exists('summaryTab')).toBe(true);
              // Template does not contain aliases or mappings, so tabs will not render
              expect(find('templateDetails.tab').map(t => t.text())).toEqual([
                'Summary',
                'Settings',
              ]);
            });
          });
        });
      });
    });
  });
});
