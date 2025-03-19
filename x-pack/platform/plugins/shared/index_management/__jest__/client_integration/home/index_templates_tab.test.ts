/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import * as fixtures from '../../../test/fixtures';
import {
  breadcrumbService,
  IndexManagementBreadcrumb,
} from '../../../public/application/services/breadcrumbs';
import { API_BASE_PATH } from '../../../common/constants';
import { setupEnvironment, getRandomString } from '../helpers';

import { IndexTemplatesTabTestBed, setup } from './index_templates_tab.helpers';

const removeWhiteSpaceOnArrayValues = (array: any[]) =>
  array.map((value) => {
    if (typeof value !== 'string') {
      return value;
    }

    // Convert non breaking spaces (&nbsp;) to ordinary space
    return value.trim().replace(/\s/g, ' ');
  });

describe('Index Templates tab', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: IndexTemplatesTabTestBed;
  jest.spyOn(breadcrumbService, 'setBreadcrumbs');

  describe('when there are no index templates of either kind', () => {
    test('updates the breadcrumbs to component templates', async () => {
      httpRequestsMockHelpers.setLoadTemplatesResponse({ templates: [], legacyTemplates: [] });

      await act(async () => {
        testBed = await setup(httpSetup);
      });
      const { component } = testBed;
      component.update();
      expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
        IndexManagementBreadcrumb.templates
      );
    });

    test('should display an empty prompt', async () => {
      httpRequestsMockHelpers.setLoadTemplatesResponse({ templates: [], legacyTemplates: [] });

      await act(async () => {
        testBed = await setup(httpSetup);
      });
      const { exists, component } = testBed;
      component.update();

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

      await act(async () => {
        testBed = await setup(httpSetup);
      });
      const { exists, component } = testBed;
      component.update();

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

      await act(async () => {
        testBed = await setup(httpSetup);
      });
      const { exists, component } = testBed;
      component.update();

      expect(exists('componentTemplatesLink')).toBe(true);
    });
  });

  describe('when there are index templates', () => {
    // Add a default loadIndexTemplate response
    const templateMock = fixtures.getTemplate();
    httpRequestsMockHelpers.setLoadTemplateResponse(templateMock.name, templateMock);

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

      await act(async () => {
        testBed = await setup(httpSetup);
      });
      testBed.component.update();
    });

    test('should list them in the table', async () => {
      const { table } = testBed;

      const { tableCellsValues } = table.getMetaData('templateTable');
      const { tableCellsValues: legacyTableCellsValues } = table.getMetaData('legacyTemplateTable');

      // Test composable table content
      tableCellsValues.forEach((row, i) => {
        const indexTemplate = templates[i];
        const { name, indexPatterns, composedOf, template } = indexTemplate;

        const hasContent = !!template?.settings || !!template?.mappings || !!template?.aliases;
        const composedOfCount = `${composedOf ? composedOf.length : 0}`;

        try {
          expect(removeWhiteSpaceOnArrayValues(row)).toEqual([
            '', // Checkbox to select row
            name,
            indexPatterns.join(', '),
            composedOfCount,
            '', // data stream column
            hasContent ? 'M S A' : 'None', // M S A -> Mappings Settings Aliases badges
            'EditDelete', // Column of actions
          ]);
        } catch (e) {
          console.error(`Error in index template at row ${i}`); // eslint-disable-line no-console
          throw e;
        }
      });

      // Test legacy table content
      legacyTableCellsValues.forEach((row, i) => {
        const legacyIndexTemplate = legacyTemplates[i];
        const { name, indexPatterns, ilmPolicy, template } = legacyIndexTemplate;

        const hasContent = !!template?.settings || !!template?.mappings || !!template?.aliases;
        const ilmPolicyName = ilmPolicy && ilmPolicy.name ? ilmPolicy.name : '';

        try {
          expect(removeWhiteSpaceOnArrayValues(row)).toEqual([
            '',
            name,
            indexPatterns.join(', '),
            ilmPolicyName,
            hasContent ? 'M S A' : 'None', // M S A -> Mappings Settings Aliases badges
            'EditDelete', // Column of actions
          ]);
        } catch (e) {
          console.error(`Error in legacy template at row ${i}`); // eslint-disable-line no-console
          throw e;
        }
      });
    });

    test('should have a button to reload the index templates', async () => {
      const { exists, actions } = testBed;

      expect(exists('reloadButton')).toBe(true);

      await act(async () => {
        actions.clickReloadButton();
      });

      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/index_templates`,
        expect.anything()
      );
    });

    test('should have a button to create a template', () => {
      const { exists } = testBed;
      // Both composable and legacy templates
      expect(exists('createTemplateButton')).toBe(true);
      expect(exists('createLegacyTemplateButton')).toBe(true);
    });

    test('should have a switch to view system templates', async () => {
      const { table, exists, actions } = testBed;
      const { rows } = table.getMetaData('legacyTemplateTable');

      expect(rows.length).toEqual(
        legacyTemplates.filter((template) => !template.name.startsWith('.')).length
      );

      expect(exists('viewButton')).toBe(true);

      actions.toggleViewItem('system');

      const { rows: updatedRows } = table.getMetaData('legacyTemplateTable');
      expect(updatedRows.length).toEqual(legacyTemplates.length);
    });

    test('should have a switch to view deprecated templates', async () => {
      const { table, actions } = testBed;
      const { tableCellsValues } = table.getMetaData('templateTable');

      // None of the available templates should have the deprecated template
      tableCellsValues.forEach((row) => {
        expect(
          removeWhiteSpaceOnArrayValues(row).every(
            (cell) => !cell.includes(deprecatedTemplate.name)
          )
        ).toBeTruthy();
      });

      actions.toggleViewItem('system');
      actions.toggleViewItem('deprecated');

      // After when all the tempaltes are available should have the deprecated template
      const { tableCellsValues: updatedTableCellsValues } = table.getMetaData('templateTable');

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
      const { find, exists, actions, component } = testBed;

      // Composable templates
      httpRequestsMockHelpers.setLoadTemplateResponse(templates[0].name, templates[0]);
      await actions.clickTemplateAt(0);
      expect(exists('templateList')).toBe(true);
      expect(exists('templateDetails')).toBe(true);
      expect(find('templateDetails.title').text().trim()).toBe(templates[0].name);

      // Close flyout
      await act(async () => {
        actions.clickCloseDetailsButton();
      });
      component.update();

      httpRequestsMockHelpers.setLoadTemplateResponse(legacyTemplates[0].name, legacyTemplates[0]);
      await actions.clickTemplateAt(0, true);

      expect(exists('templateList')).toBe(true);
      expect(exists('templateDetails')).toBe(true);
      expect(find('templateDetails.title').text().trim()).toBe(legacyTemplates[0].name);
    });

    describe('table row actions', () => {
      describe('composable templates', () => {
        test('should have an option to delete', () => {
          const { actions, findAction } = testBed;
          const [{ name: templateName }] = templates;

          actions.clickActionMenu(templateName);

          const deleteAction = findAction('delete');
          expect(deleteAction.text()).toEqual('Delete');
        });

        test('should have an option to clone', () => {
          const { actions, findAction } = testBed;
          const [{ name: templateName }] = templates;

          actions.clickActionMenu(templateName);

          const cloneAction = findAction('clone');

          expect(cloneAction.text()).toEqual('Clone');
        });

        test('should have an option to edit', () => {
          const { actions, findAction } = testBed;
          const [{ name: templateName }] = templates;

          actions.clickActionMenu(templateName);

          const editAction = findAction('edit');

          expect(editAction.text()).toEqual('Edit');
        });
      });

      describe('legacy templates', () => {
        test('should have an option to delete', () => {
          const { actions, findAction } = testBed;
          const [{ name: legacyTemplateName }] = legacyTemplates;

          actions.clickActionMenu(legacyTemplateName);

          const deleteAction = findAction('delete');
          expect(deleteAction.text()).toEqual('Delete');
        });

        test('should have an option to clone', () => {
          const { actions, findAction } = testBed;
          const [{ name: templateName }] = legacyTemplates;

          actions.clickActionMenu(templateName);

          const cloneAction = findAction('clone');

          expect(cloneAction.text()).toEqual('Clone');
        });

        test('should have an option to edit', () => {
          const { actions, findAction } = testBed;
          const [{ name: templateName }] = legacyTemplates;

          actions.clickActionMenu(templateName);

          const editAction = findAction('edit');

          expect(editAction.text()).toEqual('Edit');
        });
      });
    });

    describe('delete index template', () => {
      test('should show a confirmation when clicking the delete template button', async () => {
        const { actions } = testBed;
        const [{ name: templateName }] = templates;

        await actions.clickTemplateAction(templateName, 'delete');

        // We need to read the document "body" as the modal is added there and not inside
        // the component DOM tree.
        expect(
          document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]')
        ).not.toBe(null);

        expect(
          document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]')!.textContent
        ).toContain('Delete template');
      });

      test('should show a warning message when attempting to delete a system template', async () => {
        const { exists, actions } = testBed;

        actions.toggleViewItem('system');

        const { name: systemTemplateName } = templates[2];
        await actions.clickTemplateAction(systemTemplateName, 'delete');

        expect(exists('deleteSystemTemplateCallOut')).toBe(true);
      });

      test('should send the correct HTTP request to delete an index template', async () => {
        const { actions } = testBed;

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

        const modal = document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]');
        const confirmButton: HTMLButtonElement | null = modal!.querySelector(
          '[data-test-subj="confirmModalConfirmButton"]'
        );

        await act(async () => {
          confirmButton!.click();
        });

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
        const { actions } = testBed;
        const [{ name: templateName }] = legacyTemplates;

        await actions.clickTemplateAction(templateName, 'delete');

        // We need to read the document "body" as the modal is added there and not inside
        // the component DOM tree.
        expect(
          document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]')
        ).not.toBe(null);

        expect(
          document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]')!.textContent
        ).toContain('Delete template');
      });

      test('should show a warning message when attempting to delete a system template', async () => {
        const { exists, actions } = testBed;

        actions.toggleViewItem('system');

        const { name: systemTemplateName } = legacyTemplates[2];
        await actions.clickTemplateAction(systemTemplateName, 'delete');

        expect(exists('deleteSystemTemplateCallOut')).toBe(true);
      });

      test('should send the correct HTTP request to delete an index template', async () => {
        const { actions } = testBed;

        const [{ name: templateName }] = legacyTemplates;

        httpRequestsMockHelpers.setDeleteTemplateResponse({
          results: {
            successes: [templateName],
            errors: [],
          },
        });

        await actions.clickTemplateAction(templateName, 'delete');

        const modal = document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]');
        const confirmButton: HTMLButtonElement | null = modal!.querySelector(
          '[data-test-subj="confirmModalConfirmButton"]'
        );

        await act(async () => {
          confirmButton!.click();
        });

        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/delete_index_templates`,
          expect.objectContaining({
            body: JSON.stringify({
              templates: [{ name: templates[0].name, isLegacy: false, type: 'default' }],
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
        const { exists, actions } = testBed;

        expect(exists('templateDetails')).toBe(false);

        httpRequestsMockHelpers.setLoadTemplateResponse(templates[0].name, templates[0]);
        await actions.clickTemplateAt(0);

        expect(exists('templateDetails')).toBe(true);
      });

      describe('on mount', () => {
        beforeEach(async () => {
          const { actions } = testBed;

          httpRequestsMockHelpers.setLoadTemplateResponse(templates[0].name, templates[0]);
          await actions.clickTemplateAt(0);
        });

        test('should set the correct title', async () => {
          const { find } = testBed;
          const [{ name }] = templates;

          expect(find('templateDetails.title').text().trim()).toEqual(name);
        });

        it('should have a close button and be able to close flyout', async () => {
          const { actions, component, exists } = testBed;

          expect(exists('closeDetailsButton')).toBe(true);
          expect(exists('summaryTab')).toBe(true);

          await act(async () => {
            actions.clickCloseDetailsButton();
          });
          component.update();

          expect(exists('summaryTab')).toBe(false);
        });

        it('should have a manage button', async () => {
          const { actions, exists } = testBed;

          await actions.clickTemplateAt(0);

          expect(exists('templateDetails.manageTemplateButton')).toBe(true);
        });
      });

      describe('tabs', () => {
        test('should have 5 tabs', async () => {
          const template = fixtures.getTemplate({
            name: `a${getRandomString()}`,
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
            isLegacy: true,
          });

          const { find, actions, exists } = testBed;

          httpRequestsMockHelpers.setLoadTemplateResponse(templates[0].name, template);
          httpRequestsMockHelpers.setSimulateTemplateByNameResponse(templates[0].name, {
            simulateTemplate: 'response',
          });

          await actions.clickTemplateAt(0);

          expect(find('templateDetails.tab').length).toBe(5);
          expect(find('templateDetails.tab').map((t) => t.text())).toEqual([
            'Summary',
            'Settings',
            'Mappings',
            'Aliases',
            'Preview',
          ]);

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

          expect(find('simulateTemplatePreview').text().replace(/\s/g, '')).toEqual(
            JSON.stringify({ simulateTemplate: 'response' })
          );
        });

        test('should show an info callout if data is not present', async () => {
          const templateWithNoOptionalFields = fixtures.getTemplate({
            name: `a${getRandomString()}`,
            indexPatterns: ['template1Pattern1*', 'template1Pattern2'],
            isLegacy: true,
          });

          const { actions, find, exists } = testBed;

          httpRequestsMockHelpers.setLoadTemplateResponse(
            templates[0].name,
            templateWithNoOptionalFields
          );
          await actions.clickTemplateAt(0);

          expect(find('templateDetails.tab').length).toBe(5);
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
          const { actions, exists } = testBed;
          const error = {
            statusCode: 404,
            error: 'Not found',
            message: 'Template not found',
          };

          httpRequestsMockHelpers.setLoadTemplateResponse(templates[0].name, undefined, error);
          await actions.clickTemplateAt(0);

          expect(exists('sectionError')).toBe(true);
          // Manage button should not render if error
          expect(exists('templateDetails.manageTemplateButton')).toBe(false);
        });
      });
    });
  });
});
