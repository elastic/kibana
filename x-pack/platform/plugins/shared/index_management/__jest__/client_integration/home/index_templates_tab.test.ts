/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within, waitFor, fireEvent } from '@testing-library/react';

import * as fixtures from '../../../test/fixtures';
import {
  breadcrumbService,
  IndexManagementBreadcrumb,
} from '../../../public/application/services/breadcrumbs';
import { API_BASE_PATH } from '../../../common/constants';
import { setupEnvironment, getRandomString } from '../helpers';
import { renderHome } from '../helpers/render_home';

jest.useFakeTimers();

const removeWhiteSpaceOnArrayValues = (array: any[]) =>
  array.map((value) => {
    if (typeof value !== 'string') {
      return value;
    }
    // Convert non breaking spaces (&nbsp;) to ordinary space
    return value.trim().replace(/\s/g, ' ');
  });

/**
 * Helper to extract table cell values from a template table.
 */
const getTableCellsValues = (tableTestId: string): string[][] => {
  const table = screen.getByTestId(tableTestId);
  const rows = within(table).getAllByRole('row');
  // Skip header row (index 0)
  return rows.slice(1).map((row) => {
    const cells = within(row).getAllByRole('cell');
    return cells.map((cell) => cell.textContent?.trim().replace(/\s+/g, ' ') || '');
  });
};

/**
 * Helper to check if an element exists.
 */
const exists = (testId: string): boolean => {
  return screen.queryByTestId(testId) !== null;
};

/**
 * Actions for interacting with the index templates tab.
 */
const createActions = () => {
  const clickReloadButton = () => {
    fireEvent.click(screen.getByTestId('reloadButton'));
  };

  const toggleViewFilter = async (filter: 'managed' | 'deprecated' | 'cloudManaged' | 'system') => {
    const filterIndexMap: Record<string, number> = {
      managed: 0,
      deprecated: 1,
      cloudManaged: 2,
      system: 3,
    };
    // Click the view button to open the filter popover
    fireEvent.click(screen.getByTestId('viewButton'));
    // Wait for filter items to appear
    await waitFor(() => {
      expect(screen.getAllByTestId('filterItem').length).toBeGreaterThan(0);
    });
    // Click the appropriate filter item
    const filterItems = screen.getAllByTestId('filterItem');
    fireEvent.click(filterItems[filterIndexMap[filter]]);
  };

  const clickTemplateAt = async (index: number, isLegacy = false) => {
    const tableTestId = isLegacy ? 'legacyTemplateTable' : 'templateTable';
    const table = screen.getByTestId(tableTestId);
    const rows = within(table).getAllByRole('row');
    const dataRow = rows[index + 1]; // Skip header row
    const templateLink = within(dataRow).getByTestId('templateDetailsLink');
    fireEvent.click(templateLink);
    // Wait for the details panel to appear and load
    await screen.findByTestId('templateDetails');
    // Wait for template details to finish loading (content appears)
    await waitFor(() => {
      // Either summary tab or error section should be present
      const hasSummaryTab = screen.queryByTestId('summaryTab') !== null;
      const hasSectionError = screen.queryByTestId('sectionError') !== null;
      expect(hasSummaryTab || hasSectionError).toBe(true);
    });
  };

  const clickCloseDetailsButton = async () => {
    fireEvent.click(screen.getByTestId('closeDetailsButton'));
    // Wait for flyout to close
    await waitFor(() => {
      expect(screen.queryByTestId('templateDetails')).not.toBeInTheDocument();
    });
  };

  const clickActionMenu = async (templateName: string) => {
    // EUI uses overflow menu with id "<template_name>-actions" when > 2 actions
    const actionsButton = document.querySelector(`div[id="${templateName}-actions"] button`);
    if (actionsButton) {
      fireEvent.click(actionsButton);
      // Wait for context menu to appear
      await waitFor(() => {
        expect(document.querySelectorAll('button.euiContextMenuItem').length).toBeGreaterThan(0);
      });
    }
  };

  const findActionButton = (action: 'edit' | 'clone' | 'delete'): HTMLElement | null => {
    const buttons = document.querySelectorAll('button.euiContextMenuItem');
    const actionIndex = ['edit', 'clone', 'delete'].indexOf(action);
    return (buttons[actionIndex] as HTMLElement) || null;
  };

  const clickTemplateAction = async (templateName: string, action: 'edit' | 'clone' | 'delete') => {
    await clickActionMenu(templateName);
    const buttons = document.querySelectorAll('button.euiContextMenuItem');
    const actionIndex = ['edit', 'clone', 'delete'].indexOf(action);
    fireEvent.click(buttons[actionIndex]);
  };

  const selectDetailsTab = async (
    tab: 'summary' | 'settings' | 'mappings' | 'aliases' | 'preview'
  ) => {
    const tabIndexMap: Record<string, number> = {
      summary: 0,
      settings: 1,
      mappings: 2,
      aliases: 3,
      preview: 4,
    };
    // Note: The data-test-subj is just "tab" in template_details_content.tsx
    const tabs = screen.getAllByTestId('tab');
    fireEvent.click(tabs[tabIndexMap[tab]]);

    // Wait for the tab content to appear (either content or "no content" callout)
    const tabContentTestIds: Record<string, string[]> = {
      summary: ['summaryTab'],
      settings: ['settingsTabContent', 'noSettingsCallout'],
      mappings: ['mappingsTabContent', 'noMappingsCallout'],
      aliases: ['aliasesTabContent', 'noAliasesCallout'],
      preview: ['previewTabContent'],
    };
    await waitFor(() => {
      const testIds = tabContentTestIds[tab];
      const found = testIds.some((testId) => screen.queryByTestId(testId) !== null);
      expect(found).toBe(true);
    });
  };

  return {
    clickReloadButton,
    toggleViewFilter,
    clickTemplateAt,
    clickCloseDetailsButton,
    clickActionMenu,
    findActionButton,
    clickTemplateAction,
    selectDetailsTab,
  };
};

describe('Index Templates tab', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  jest.spyOn(breadcrumbService, 'setBreadcrumbs');

  /**
   * Wait for the template list to fully load (loading spinner gone).
   */
  const waitForTemplateListToLoad = async () => {
    await screen.findByTestId('templateList');
    await waitFor(() => {
      expect(screen.queryByTestId('sectionLoading')).not.toBeInTheDocument();
    });
  };

  describe('when there are no index templates of either kind', () => {
    test('updates the breadcrumbs to component templates', async () => {
      httpRequestsMockHelpers.setLoadTemplatesResponse({ templates: [], legacyTemplates: [] });

      renderHome(httpSetup, { initialEntries: ['/templates'] });

      await waitForTemplateListToLoad();

      expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
        IndexManagementBreadcrumb.templates
      );
    });

    test('should display an empty prompt', async () => {
      httpRequestsMockHelpers.setLoadTemplatesResponse({ templates: [], legacyTemplates: [] });

      renderHome(httpSetup, { initialEntries: ['/templates'] });

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

      renderHome(httpSetup, { initialEntries: ['/templates'] });

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

      renderHome(httpSetup, { initialEntries: ['/templates'] });

      await waitForTemplateListToLoad();

      expect(exists('componentTemplatesLink')).toBe(true);
    });
  });

  describe('when there are index templates', () => {
    const actions = createActions();

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

      renderHome(httpSetup, { initialEntries: ['/templates'] });

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
      expect(exists('reloadButton')).toBe(true);

      actions.clickReloadButton();

      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/index_templates`,
        expect.anything()
      );
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
      expect(screen.getByTestId('title').textContent?.trim()).toBe(
        legacyTemplates[0].name
      );
    });

    describe('table row actions', () => {
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

        const modal = document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]');
        const confirmButton: HTMLButtonElement | null = modal!.querySelector(
          '[data-test-subj="confirmModalConfirmButton"]'
        );

        fireEvent.click(confirmButton!);

        // Wait for the API call to be made
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

        const modal = document.body.querySelector('[data-test-subj="deleteTemplatesConfirmation"]');
        const confirmButton: HTMLButtonElement | null = modal!.querySelector(
          '[data-test-subj="confirmModalConfirmButton"]'
        );

        fireEvent.click(confirmButton!);

        // Wait for the modal to close and the API call to be made
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
            isLegacy: false, // Composable template to include Preview tab
          });

          httpRequestsMockHelpers.setLoadTemplateResponse(templates[0].name, template);
          httpRequestsMockHelpers.setSimulateTemplateByNameResponse(templates[0].name, {
            simulateTemplate: 'response',
          });

          await actions.clickTemplateAt(0);

          // Note: The data-test-subj is just "tab" in template_details_content.tsx
          const tabs = screen.getAllByTestId('tab');
          expect(tabs.length).toBe(5);
          expect(tabs.map((t) => t.textContent)).toEqual([
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

          // Wait for the simulate preview to load
          await screen.findByTestId('simulateTemplatePreview');

          expect(
            screen.getByTestId('simulateTemplatePreview').textContent?.replace(/\s/g, '')
          ).toEqual(JSON.stringify({ simulateTemplate: 'response' }));
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

          // Note: The data-test-subj is just "tab" in template_details_content.tsx
          // Composable templates have 5 tabs (including Preview tab)
          const tabs = screen.getAllByTestId('tab');
          expect(tabs.length).toBe(5);
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
