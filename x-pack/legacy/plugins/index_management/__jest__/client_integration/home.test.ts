/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';
import * as fixtures from '../../test/fixtures';
import { setupEnvironment, pageHelpers, nextTick, getRandomString } from './helpers';
import { IdxMgmtHomeTestBed } from './helpers/home.helpers';
import { API_BASE_PATH } from '../../common/constants';

const { setup } = pageHelpers.home;

const removeWhiteSpaceOnArrayValues = (array: any[]) =>
  array.map(value => {
    if (!value.trim) {
      return value;
    }
    return value.trim();
  });

jest.mock('ui/new_platform');

describe('<IndexManagementHome />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: IdxMgmtHomeTestBed;

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([]);

      testBed = await setup();

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
        const templatesTab = find('templatesTab');
        const indicesTab = find('indicesTab');

        expect(indicesTab.length).toBe(1);
        expect(indicesTab.text()).toEqual('Indices');
        expect(templatesTab.length).toBe(1);
        expect(templatesTab.text()).toEqual('Index Templates');
      });

      test('should navigate to Index Templates tab', async () => {
        const { exists, actions, component } = testBed;

        expect(exists('indicesList')).toBe(true);
        expect(exists('templateList')).toBe(false);

        httpRequestsMockHelpers.setLoadTemplatesResponse([]);

        actions.selectHomeTab('templatesTab');

        await act(async () => {
          await nextTick();
          component.update();
        });

        expect(exists('indicesList')).toBe(false);
        expect(exists('templateList')).toBe(true);
      });
    });

    describe('index templates', () => {
      describe('when there are no index templates', () => {
        beforeEach(async () => {
          const { actions, component } = testBed;

          httpRequestsMockHelpers.setLoadTemplatesResponse([]);

          actions.selectHomeTab('templatesTab');

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
          settings: {
            index: {
              number_of_shards: '1',
              lifecycle: {
                name: 'my_ilm_policy',
              },
            },
          },
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

          actions.selectHomeTab('templatesTab');

          await act(async () => {
            await nextTick();
            component.update();
          });
        });

        test('should list them in the table', async () => {
          const { table } = testBed;

          const { tableCellsValues } = table.getMetaData('templateTable');

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

          await act(async () => {
            actions.clickReloadButton();
            await nextTick();
            component.update();
          });

          expect(server.requests.length).toBe(totalRequests + 1);
          expect(server.requests[server.requests.length - 1].url).toBe(
            `${API_BASE_PATH}/templates`
          );
        });

        test('should have a button to create a new template', () => {
          const { exists } = testBed;
          expect(exists('createTemplateButton')).toBe(true);
        });

        test('should have a switch to view system templates', async () => {
          const { table, exists, component, form } = testBed;
          const { rows } = table.getMetaData('templateTable');

          expect(rows.length).toEqual(
            templates.filter(template => !template.name.startsWith('.')).length
          );

          expect(exists('systemTemplatesSwitch')).toBe(true);

          await act(async () => {
            form.toggleEuiSwitch('systemTemplatesSwitch');
            await nextTick();
            component.update();
          });

          const { rows: updatedRows } = table.getMetaData('templateTable');
          expect(updatedRows.length).toEqual(templates.length);
        });

        test('each row should have a link to the template details panel', async () => {
          const { find, exists, actions } = testBed;

          await actions.clickTemplateAt(0);

          expect(exists('templateList')).toBe(true);
          expect(exists('templateDetails')).toBe(true);
          expect(find('templateDetails.title').text()).toBe(template1.name);
        });

        test('template actions column should have an option to delete', () => {
          const { actions, findAction } = testBed;
          const { name: templateName } = template1;

          actions.clickActionMenu(templateName);

          const deleteAction = findAction('delete');

          expect(deleteAction.text()).toEqual('Delete');
        });

        test('template actions column should have an option to clone', () => {
          const { actions, findAction } = testBed;
          const { name: templateName } = template1;

          actions.clickActionMenu(templateName);

          const cloneAction = findAction('clone');

          expect(cloneAction.text()).toEqual('Clone');
        });

        test('template actions column should have an option to edit', () => {
          const { actions, findAction } = testBed;
          const { name: templateName } = template1;

          actions.clickActionMenu(templateName);

          const editAction = findAction('edit');

          expect(editAction.text()).toEqual('Edit');
        });

        describe('delete index template', () => {
          test('should show a confirmation when clicking the delete template button', async () => {
            const { actions } = testBed;
            const { name: templateName } = template1;

            await actions.clickTemplateAction(templateName, 'delete');

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

            await act(async () => {
              form.toggleEuiSwitch('systemTemplatesSwitch');
              await nextTick();
              component.update();
            });

            const { name: systemTemplateName } = template3;
            await actions.clickTemplateAction(systemTemplateName, 'delete');

            expect(
              document.body.querySelector('[data-test-subj="deleteSystemTemplateCallOut"]')
            ).not.toBe(null);
          });

          test('should send the correct HTTP request to delete an index template', async () => {
            const { component, actions, table } = testBed;
            const { rows } = table.getMetaData('templateTable');

            const templateId = rows[0].columns[2].value;

            const { name: templateName } = template1;
            await actions.clickTemplateAction(templateName, 'delete');

            const modal = document.body.querySelector(
              '[data-test-subj="deleteTemplatesConfirmation"]'
            );
            const confirmButton: HTMLButtonElement | null = modal!.querySelector(
              '[data-test-subj="confirmModalConfirmButton"]'
            );

            httpRequestsMockHelpers.setDeleteTemplateResponse({
              results: {
                successes: [templateId],
                errors: [],
              },
            });

            await act(async () => {
              confirmButton!.click();
              await nextTick();
              component.update();
            });

            const latestRequest = server.requests[server.requests.length - 1];

            expect(latestRequest.method).toBe('DELETE');
            expect(latestRequest.url).toBe(`${API_BASE_PATH}/templates/${template1.name}`);
          });
        });

        describe('detail panel', () => {
          beforeEach(async () => {
            const template = fixtures.getTemplate({
              name: `a${getRandomString()}`,
              indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
            });

            httpRequestsMockHelpers.setLoadTemplateResponse(template);
          });

          test('should show details when clicking on a template', async () => {
            const { exists, actions } = testBed;

            expect(exists('templateDetails')).toBe(false);

            await actions.clickTemplateAt(0);

            expect(exists('templateDetails')).toBe(true);
          });

          describe('on mount', () => {
            beforeEach(async () => {
              const { actions } = testBed;

              await actions.clickTemplateAt(0);
            });

            test('should set the correct title', async () => {
              const { find } = testBed;
              const { name } = template1;

              expect(find('templateDetails.title').text()).toEqual(name);
            });

            it('should have a close button and be able to close flyout', async () => {
              const { actions, component, exists } = testBed;

              expect(exists('closeDetailsButton')).toBe(true);
              expect(exists('summaryTab')).toBe(true);

              actions.clickCloseDetailsButton();

              await act(async () => {
                await nextTick();
                component.update();
              });

              expect(exists('summaryTab')).toBe(false);
            });

            it('should have a manage button', async () => {
              const { actions, exists } = testBed;

              await actions.clickTemplateAt(0);

              expect(exists('templateDetails.manageTemplateButton')).toBe(true);
            });
          });

          describe('tabs', () => {
            test('should have 4 tabs', async () => {
              const template = fixtures.getTemplate({
                name: `a${getRandomString()}`,
                indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
                settings: {
                  index: {
                    number_of_shards: '1',
                  },
                },
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
                aliases: {
                  alias1: {},
                },
              });

              const { find, actions, exists } = testBed;

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
              expect(exists('summaryTab')).toBe(false);
              expect(exists('settingsTab')).toBe(true);

              actions.selectDetailsTab('aliases');
              expect(exists('summaryTab')).toBe(false);
              expect(exists('settingsTab')).toBe(false);
              expect(exists('aliasesTab')).toBe(true);

              actions.selectDetailsTab('mappings');
              expect(exists('summaryTab')).toBe(false);
              expect(exists('settingsTab')).toBe(false);
              expect(exists('aliasesTab')).toBe(false);
              expect(exists('mappingsTab')).toBe(true);
            });

            test('should show an info callout if data is not present', async () => {
              const templateWithNoOptionalFields = fixtures.getTemplate({
                name: `a${getRandomString()}`,
                indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
              });

              const { actions, find, exists, component } = testBed;

              httpRequestsMockHelpers.setLoadTemplateResponse(templateWithNoOptionalFields);

              await actions.clickTemplateAt(0);

              await act(async () => {
                await nextTick();
                component.update();
              });

              expect(find('templateDetails.tab').length).toBe(4);
              expect(exists('summaryTab')).toBe(true);

              // Navigate and verify callout message per tab
              actions.selectDetailsTab('settings');
              expect(exists('noSettingsCallout')).toBe(true);

              actions.selectDetailsTab('mappings');
              expect(exists('noMappingsCallout')).toBe(true);

              actions.selectDetailsTab('aliases');
              expect(exists('noAliasesCallout')).toBe(true);
            });
          });

          describe('error handling', () => {
            it('should render an error message if error fetching template details', async () => {
              const { actions, exists } = testBed;
              const error = {
                status: 404,
                error: 'Not found',
                message: 'Template not found',
              };

              httpRequestsMockHelpers.setLoadTemplateResponse(undefined, { body: error });

              await actions.clickTemplateAt(0);

              expect(exists('sectionError')).toBe(true);
              // Manage button should not render if error
              expect(exists('templateDetails.manageTemplateButton')).toBe(false);
            });
          });
        });
      });
    });
  });
});
