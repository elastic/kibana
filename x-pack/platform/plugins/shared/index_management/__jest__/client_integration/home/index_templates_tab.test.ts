/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within, waitFor, fireEvent } from '@testing-library/react';
import { getRandomString } from '@kbn/test-jest-helpers';

import * as fixtures from '../../../test/fixtures';
import {
  breadcrumbService,
  IndexManagementBreadcrumb,
} from '../../../public/application/services/breadcrumbs';
import { API_BASE_PATH } from '../../../common/constants';
import { renderHome } from '../helpers/render_home';
import { setupEnvironment } from '../helpers/setup_environment';
import {
  createIndexTemplatesTabActions,
  exists,
  getTableCellsValues,
  removeWhiteSpaceOnArrayValues,
  waitForTemplateListToLoad,
} from './index_templates_tab.helpers';

describe('Index Templates tab', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let setDelayResponse: ReturnType<typeof setupEnvironment>['setDelayResponse'];
  jest.spyOn(breadcrumbService, 'setBreadcrumbs');

  beforeEach(() => {
    jest.clearAllMocks();
    const env = setupEnvironment();
    httpSetup = env.httpSetup;
    httpRequestsMockHelpers = env.httpRequestsMockHelpers;
    setDelayResponse = env.setDelayResponse;
    setDelayResponse(false);
  });

  describe('when there are no index templates of either kind', () => {
    test('updates the breadcrumbs to component templates', async () => {
      httpRequestsMockHelpers.setLoadTemplatesResponse({ templates: [], legacyTemplates: [] });

      await renderHome(httpSetup, { initialEntries: ['/templates'] });

      await waitForTemplateListToLoad();

      expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
        IndexManagementBreadcrumb.templates
      );
    });

    test('should display an empty prompt', async () => {
      httpRequestsMockHelpers.setLoadTemplatesResponse({ templates: [], legacyTemplates: [] });

      await renderHome(httpSetup, { initialEntries: ['/templates'] });

      await waitForTemplateListToLoad();

      expect(exists('sectionLoading')).toBe(false);
      expect(exists('emptyPrompt')).toBe(true);
    });
  });

  describe('when there are composable index templates but no legacy index templates', () => {
    test('only the composable index templates table is visible', async () => {
      httpRequestsMockHelpers.setLoadTemplatesResponse({
        templates: [fixtures.getComposableTemplate()],
        legacyTemplates: [],
      });

      await renderHome(httpSetup, { initialEntries: ['/templates'] });

      await waitForTemplateListToLoad();

      expect(exists('sectionLoading')).toBe(false);
      expect(exists('emptyPrompt')).toBe(false);
      expect(exists('templateTable')).toBe(true);
      expect(exists('legacyTemplateTable')).toBe(false);
    });

    test('Components column renders a link to Component templates', async () => {
      httpRequestsMockHelpers.setLoadTemplatesResponse({
        templates: [
          fixtures.getComposableTemplate({
            name: 'Test',
            composedOf: ['component1', 'component2'],
          }),
        ],
        legacyTemplates: [],
      });

      await renderHome(httpSetup, { initialEntries: ['/templates'] });

      await waitForTemplateListToLoad();

      expect(exists('componentTemplatesLink')).toBe(true);
    });
  });

  describe('when there are index templates', () => {
    const actions = createIndexTemplatesTabActions();

    // Add a default loadIndexTemplate response
    const templateMock = fixtures.getTemplate();
    beforeEach(() => {
      httpRequestsMockHelpers.setLoadTemplateResponse(templateMock.name, templateMock);
    });

    const template1 = fixtures.getTemplate({
      name: `a${getRandomString()}`,
      indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
      template: {
        settings: {
          index: {
            number_of_shards: '1',
            lifecycle: {
              name: 'my_ilm_policy',
            },
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
      type: 'system',
    });

    const deprecatedTemplate = fixtures.getTemplate({
      name: `.d${getRandomString()}`,
      indexPatterns: ['template7Pattern1*'],
      type: 'system',
      deprecated: true,
    });

    const template4 = fixtures.getTemplate({
      name: `a${getRandomString()}`,
      indexPatterns: ['template4Pattern1*', 'template4Pattern2'],
      template: {
        settings: {
          index: {
            number_of_shards: '1',
            lifecycle: {
              name: 'my_ilm_policy',
            },
          },
        },
      },
      isLegacy: true,
    });

    const template5 = fixtures.getTemplate({
      name: `b${getRandomString()}`,
      indexPatterns: ['template5Pattern1*'],
      isLegacy: true,
    });

    const template6 = fixtures.getTemplate({
      name: `.c${getRandomString()}`, // mock system template
      indexPatterns: ['template6Pattern1*', 'template6Pattern2', 'template6Pattern3'],
      isLegacy: true,
      type: 'system',
    });

    const templates = [template1, template2, template3, deprecatedTemplate];
    const legacyTemplates = [template4, template5, template6];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadTemplatesResponse({ templates, legacyTemplates });

      await renderHome(httpSetup, { initialEntries: ['/templates'] });

      await waitForTemplateListToLoad();
    });

    test('should list them in the table', async () => {
      const tableCellsValues = getTableCellsValues('templateTable');
      const legacyTableCellsValues = getTableCellsValues('legacyTemplateTable');

      // Test composable table content
      tableCellsValues.forEach((row, i) => {
        const indexTemplate = templates[i];
        const { name, indexPatterns, composedOf, template } = indexTemplate;

        const hasContent = !!template?.settings || !!template?.mappings || !!template?.aliases;
        const composedOfCount = `${composedOf ? composedOf.length : 0}`;

        expect(removeWhiteSpaceOnArrayValues(row)).toEqual([
          '', // Checkbox to select row
          name,
          indexPatterns.join(', '),
          composedOfCount,
          '', // data stream column
          hasContent ? 'M S A' : 'None', // M S A -> Mappings Settings Aliases badges
          expect.any(String), // Column of actions
        ]);
      });

      // Test legacy table content
      legacyTableCellsValues.forEach((row, i) => {
        const legacyIndexTemplate = legacyTemplates[i];
        const { name, indexPatterns, ilmPolicy, template } = legacyIndexTemplate;

        const hasContent = !!template?.settings || !!template?.mappings || !!template?.aliases;
        const ilmPolicyName = ilmPolicy && ilmPolicy.name ? ilmPolicy.name : '';

        expect(removeWhiteSpaceOnArrayValues(row)).toEqual([
          '',
          name,
          indexPatterns.join(', '),
          ilmPolicyName,
          hasContent ? 'M S A' : 'None', // M S A -> Mappings Settings Aliases badges
          expect.any(String), // Column of actions
        ]);
      });
    });

    test('should have a button to reload the index templates', async () => {
      expect(exists('reloadButton')).toBe(true);

      actions.clickReloadButton();

      await waitFor(() => {
        expect(httpSetup.get).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/index_templates`,
          expect.anything()
        );
      });
    });

    test('should have a button to create a template', () => {
      // Both composable and legacy templates
      expect(exists('createTemplateButton')).toBe(true);
      expect(exists('createLegacyTemplateButton')).toBe(true);
    });

    test('should have a switch to view system templates', async () => {
      const tableRowsBefore = getTableCellsValues('legacyTemplateTable');

      expect(tableRowsBefore.length).toEqual(
        legacyTemplates.filter((template) => !template.name.startsWith('.')).length
      );

      expect(exists('viewButton')).toBe(true);

      await actions.toggleViewFilter('system');

      const tableRowsAfter = getTableCellsValues('legacyTemplateTable');
      expect(tableRowsAfter.length).toEqual(legacyTemplates.length);
    });

    test('should have a switch to view deprecated templates', async () => {
      const tableCellsValues = getTableCellsValues('templateTable');

      // None of the available templates should have the deprecated template
      tableCellsValues.forEach((row) => {
        expect(
          removeWhiteSpaceOnArrayValues(row).every(
            (cell) => !cell.includes(deprecatedTemplate.name)
          )
        ).toBeTruthy();
      });

      await actions.toggleViewFilter('system');
      await actions.toggleViewFilter('deprecated');

      // After when all the templates are available should have the deprecated template
      const updatedTableCellsValues = getTableCellsValues('templateTable');

      // Find the row that has the deprecated template
      const tableCellsWithDeprecatedTemplate = updatedTableCellsValues.filter((row) => {
        return removeWhiteSpaceOnArrayValues(row).some((cell) =>
          cell.includes(deprecatedTemplate.name)
        );
      });
      // Assert that it has one row with the deprecated template
      expect(tableCellsWithDeprecatedTemplate.length).toBe(1);
    });

    test('each row should have a link to the template details panel', async () => {
      // Composable templates
      httpRequestsMockHelpers.setLoadTemplateResponse(templates[0].name, templates[0]);
      await actions.clickTemplateAt(0);

      expect(exists('templateList')).toBe(true);
      expect(exists('templateDetails')).toBe(true);
      expect(screen.getByTestId('title').textContent?.trim()).toBe(templates[0].name);

      // Close flyout
      await actions.clickCloseDetailsButton();

      // Legacy templates
      httpRequestsMockHelpers.setLoadTemplateResponse(legacyTemplates[0].name, legacyTemplates[0]);
      await actions.clickTemplateAt(0, true);

      expect(exists('templateList')).toBe(true);
      expect(exists('templateDetails')).toBe(true);
      expect(screen.getByTestId('title').textContent?.trim()).toBe(legacyTemplates[0].name);
    });

    describe('table row actions', () => {
      afterEach(async () => {
        // Some tests open an actions popover only to assert menu items exist.
        // Close it so it doesn't leak popover state across tests.
        await actions.closeOpenActionMenu();
      });

      describe('composable templates', () => {
        test('should have an option to delete', async () => {
          const [{ name: templateName }] = templates;

          await actions.clickActionMenu(templateName);

          const deleteAction = actions.findActionButton('delete');
          expect(deleteAction?.textContent).toEqual('Delete');
        });

        test('should have an option to clone', async () => {
          const [{ name: templateName }] = templates;

          await actions.clickActionMenu(templateName);

          const cloneAction = actions.findActionButton('clone');
          expect(cloneAction?.textContent).toEqual('Clone');
        });

        test('should have an option to edit', async () => {
          const [{ name: templateName }] = templates;

          await actions.clickActionMenu(templateName);

          const editAction = actions.findActionButton('edit');
          expect(editAction?.textContent).toEqual('Edit');
        });
      });

      describe('legacy templates', () => {
        test('should have an option to delete', async () => {
          const [{ name: legacyTemplateName }] = legacyTemplates;

          await actions.clickActionMenu(legacyTemplateName);

          const deleteAction = actions.findActionButton('delete');
          expect(deleteAction?.textContent).toEqual('Delete');
        });

        test('should have an option to clone', async () => {
          const [{ name: templateName }] = legacyTemplates;

          await actions.clickActionMenu(templateName);

          const cloneAction = actions.findActionButton('clone');
          expect(cloneAction?.textContent).toEqual('Clone');
        });

        test('should have an option to edit', async () => {
          const [{ name: templateName }] = legacyTemplates;

          await actions.clickActionMenu(templateName);

          const editAction = actions.findActionButton('edit');
          expect(editAction?.textContent).toEqual('Edit');
        });
      });
    });

    describe('delete index template', () => {
      test('should show a confirmation when clicking the delete template button', async () => {
        const [{ name: templateName }] = templates;

        await actions.clickTemplateAction(templateName, 'delete');

        const modal = await screen.findByTestId('deleteTemplatesConfirmation');
        expect(modal).toHaveTextContent('Delete template');
      });

      test('should show a warning message when attempting to delete a system template', async () => {
        await actions.toggleViewFilter('system');

        const { name: systemTemplateName } = templates[2];
        await actions.clickTemplateAction(systemTemplateName, 'delete');

        expect(exists('deleteSystemTemplateCallOut')).toBe(true);
      });

      test('should send the correct HTTP request to delete an index template', async () => {
        const [
          {
            name: templateName,
            _kbnMeta: { isLegacy },
          },
        ] = templates;

        httpRequestsMockHelpers.setDeleteTemplateResponse({
          results: {
            successes: [templateName],
            errors: [],
          },
        });

        await actions.clickTemplateAction(templateName, 'delete');

        const modal = await screen.findByTestId('deleteTemplatesConfirmation');
        fireEvent.click(within(modal).getByTestId('confirmModalConfirmButton'));

        await waitFor(() => {
          expect(httpSetup.post).toHaveBeenCalledWith(
            `${API_BASE_PATH}/delete_index_templates`,
            expect.anything()
          );
        });

        // Composable templates include `type` in the request body
        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/delete_index_templates`,
          expect.objectContaining({
            body: JSON.stringify({
              templates: [{ name: templates[0].name, isLegacy, type: 'default' }],
            }),
          })
        );
      });
    });

    describe('delete legacy index template', () => {
      test('should show a confirmation when clicking the delete template button', async () => {
        const [{ name: templateName }] = legacyTemplates;

        await actions.clickTemplateAction(templateName, 'delete');

        const modal = await screen.findByTestId('deleteTemplatesConfirmation');
        expect(modal).toHaveTextContent('Delete template');
      });

      test('should show a warning message when attempting to delete a system template', async () => {
        await actions.toggleViewFilter('system');

        const { name: systemTemplateName } = legacyTemplates[2];
        await actions.clickTemplateAction(systemTemplateName, 'delete');

        expect(exists('deleteSystemTemplateCallOut')).toBe(true);
      });

      test('should send the correct HTTP request to delete an index template', async () => {
        const [{ name: templateName }] = legacyTemplates;

        httpRequestsMockHelpers.setDeleteTemplateResponse({
          results: {
            successes: [templateName],
            errors: [],
          },
        });

        await actions.clickTemplateAction(templateName, 'delete');

        const modal = await screen.findByTestId('deleteTemplatesConfirmation');
        fireEvent.click(within(modal).getByTestId('confirmModalConfirmButton'));

        await waitFor(() => {
          expect(httpSetup.post).toHaveBeenCalledWith(
            `${API_BASE_PATH}/delete_index_templates`,
            expect.anything()
          );
        });

        // Verify the exact call arguments
        // Note: The API only expects { name, isLegacy } - no `type` property
        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/delete_index_templates`,
          expect.objectContaining({
            body: JSON.stringify({
              // legacyTemplates[0] is clicked, so we expect isLegacy: true
              templates: [{ name: legacyTemplates[0].name, isLegacy: true }],
            }),
          })
        );
      });
    });

    describe('detail panel', () => {
      beforeEach(async () => {
        const template = fixtures.getTemplate({
          name: `a${getRandomString()}`,
          indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
          isLegacy: true,
        });

        httpRequestsMockHelpers.setLoadTemplateResponse(template.name, template);
      });

      test('should show details when clicking on a template', async () => {
        expect(exists('templateDetails')).toBe(false);

        httpRequestsMockHelpers.setLoadTemplateResponse(templates[0].name, templates[0]);
        await actions.clickTemplateAt(0);

        expect(exists('templateDetails')).toBe(true);
      });

      describe('on mount', () => {
        beforeEach(async () => {
          httpRequestsMockHelpers.setLoadTemplateResponse(templates[0].name, templates[0]);
          await actions.clickTemplateAt(0);
        });

        test('should set the correct title', async () => {
          const [{ name }] = templates;

          expect(screen.getByTestId('title').textContent?.trim()).toEqual(name);
        });

        it('should have a close button and be able to close flyout', async () => {
          expect(exists('closeDetailsButton')).toBe(true);
          expect(exists('summaryTab')).toBe(true);

          await actions.clickCloseDetailsButton();

          expect(exists('summaryTab')).toBe(false);
        });

        it('should have a manage button', async () => {
          await actions.clickTemplateAt(0);

          expect(exists('manageTemplateButton')).toBe(true);
        });
      });

      describe('tabs', () => {
        test('should have 5 tabs for composable templates', async () => {
          // Use a composable (non-legacy) template to get all 5 tabs including Preview
          const template = fixtures.getTemplate({
            name: templates[0].name,
            indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
            template: {
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
            },
            isLegacy: false, // Composable template to include Preview tab
          });

          httpRequestsMockHelpers.setLoadTemplateResponse(templates[0].name, template);
          httpRequestsMockHelpers.setSimulateTemplateByNameResponse(templates[0].name, {
            template: {
              mappings: { properties: { foo: { type: 'keyword' } } },
              settings: { index: { number_of_shards: 1 } },
              aliases: { foo_alias: {} },
            },
          });
          // Some callers may URL-encode the template name segment; register both.
          httpRequestsMockHelpers.setSimulateTemplateByNameResponse(
            encodeURIComponent(templates[0].name),
            {
              template: {
                mappings: { properties: { foo: { type: 'keyword' } } },
                settings: { index: { number_of_shards: 1 } },
                aliases: { foo_alias: {} },
              },
            }
          );

          await actions.clickTemplateAt(0);

          expect(exists('summaryTabBtn')).toBe(true);
          expect(exists('settingsTabBtn')).toBe(true);
          expect(exists('mappingsTabBtn')).toBe(true);
          expect(exists('aliasesTabBtn')).toBe(true);
          expect(exists('previewTabBtn')).toBe(true);

          // Summary tab should be initial active tab
          expect(exists('summaryTab')).toBe(true);

          // Navigate and verify all tabs
          await actions.selectDetailsTab('settings');
          expect(exists('summaryTab')).toBe(false);
          expect(exists('settingsTabContent')).toBe(true);

          await actions.selectDetailsTab('aliases');
          expect(exists('summaryTab')).toBe(false);
          expect(exists('settingsTabContent')).toBe(false);
          expect(exists('aliasesTabContent')).toBe(true);

          await actions.selectDetailsTab('mappings');
          expect(exists('summaryTab')).toBe(false);
          expect(exists('settingsTabContent')).toBe(false);
          expect(exists('aliasesTabContent')).toBe(false);
          expect(exists('mappingsTabContent')).toBe(true);

          await actions.selectDetailsTab('preview');
          expect(exists('summaryTab')).toBe(false);
          expect(exists('settingsTabContent')).toBe(false);
          expect(exists('aliasesTabContent')).toBe(false);
          expect(exists('mappingsTabContent')).toBe(false);
          expect(exists('previewTabContent')).toBe(true);

          // SimulateTemplate sets state after an async simulate call; wait for the preview to render
          // so the update happens within an awaited RTL boundary (avoids act warnings).
          await screen.findByTestId('simulateTemplatePreview');

          // Ensure the simulate API is called for this template name
          await waitFor(() => {
            expect(httpSetup.post.mock.calls.map((c) => c[0])).toContain(
              `${API_BASE_PATH}/index_templates/simulate/${templates[0].name}`
            );
          });
        });

        test('should show an info callout if data is not present', async () => {
          // Note: clickTemplateAt(0) clicks on a composable template, not a legacy one.
          // The isLegacy flag is determined from URL query params, not from the template data.
          // So composable templates will have 5 tabs including Preview.
          const templateWithNoOptionalFields = fixtures.getTemplate({
            name: `a${getRandomString()}`,
            indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
            // Even if we set isLegacy: true here, the clicked row is a composable template
            // and the URL won't have ?legacy=true, so it shows 5 tabs.
            isLegacy: false,
          });

          httpRequestsMockHelpers.setLoadTemplateResponse(
            templates[0].name,
            templateWithNoOptionalFields
          );
          await actions.clickTemplateAt(0);

          expect(exists('summaryTabBtn')).toBe(true);
          expect(exists('settingsTabBtn')).toBe(true);
          expect(exists('mappingsTabBtn')).toBe(true);
          expect(exists('aliasesTabBtn')).toBe(true);
          expect(exists('previewTabBtn')).toBe(true);
          expect(exists('summaryTab')).toBe(true);

          // Navigate and verify callout message per tab
          await actions.selectDetailsTab('settings');
          expect(exists('noSettingsCallout')).toBe(true);

          await actions.selectDetailsTab('mappings');
          expect(exists('noMappingsCallout')).toBe(true);

          await actions.selectDetailsTab('aliases');
          expect(exists('noAliasesCallout')).toBe(true);
        });
      });

      describe('error handling', () => {
        it('should render an error message if error fetching template details', async () => {
          const error = {
            statusCode: 404,
            error: 'Not found',
            message: 'Template not found',
          };

          httpRequestsMockHelpers.setLoadTemplateResponse(templates[0].name, undefined, error);
          await actions.clickTemplateAt(0);

          expect(exists('sectionError')).toBe(true);
          // Manage button should not render if error
          expect(exists('manageTemplateButton')).toBe(false);
        });
      });
    });
  });
});
