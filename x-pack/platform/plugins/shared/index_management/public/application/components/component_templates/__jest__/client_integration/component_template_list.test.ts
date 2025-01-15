/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { breadcrumbService, IndexManagementBreadcrumb } from '../../../../services/breadcrumbs';
import { ComponentTemplateListItem } from '../../shared_imports';

import { setupEnvironment, pageHelpers } from './helpers';
import { ComponentTemplateListTestBed } from './helpers/component_template_list.helpers';
import { API_BASE_PATH } from './helpers/constants';

const { setup } = pageHelpers.componentTemplateList;

describe('<ComponentTemplateList />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: ComponentTemplateListTestBed;
  jest.spyOn(breadcrumbService, 'setBreadcrumbs');

  beforeEach(async () => {
    await act(async () => {
      testBed = await setup(httpSetup);
    });

    testBed.component.update();
  });

  test('updates the breadcrumbs to component templates', () => {
    expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
      IndexManagementBreadcrumb.componentTemplates
    );
  });

  describe('With component templates', () => {
    const componentTemplate1: ComponentTemplateListItem = {
      name: 'test_component_template_1',
      hasMappings: true,
      hasAliases: true,
      hasSettings: true,
      usedBy: [],
      isManaged: false,
      isDeprecated: false,
    };

    const componentTemplate2: ComponentTemplateListItem = {
      name: 'test_component_template_2',
      hasMappings: true,
      hasAliases: true,
      hasSettings: true,
      usedBy: ['test_index_template_1'],
      isManaged: false,
      isDeprecated: false,
    };

    const componentTemplate3: ComponentTemplateListItem = {
      name: 'test_component_template_3',
      hasMappings: true,
      hasAliases: true,
      hasSettings: true,
      usedBy: ['test_index_template_1', 'test_index_template_2'],
      isManaged: false,
      isDeprecated: true,
    };

    const componentTemplates = [componentTemplate1, componentTemplate2, componentTemplate3];

    httpRequestsMockHelpers.setLoadComponentTemplatesResponse(componentTemplates);

    test('should render the list view', async () => {
      const { table } = testBed;

      // Verify table content
      const { tableCellsValues } = table.getMetaData('componentTemplatesTable');
      tableCellsValues.forEach((row, i) => {
        const { name, usedBy } = componentTemplates[i];
        const usedByText = usedBy.length === 0 ? 'Not in use' : usedBy.length.toString();

        expect(row).toEqual(['', name, usedByText, '', '', '', 'EditDelete']);
      });
    });

    test('should sort "Usage count" column by number', async () => {
      const { actions, table } = testBed;

      // Sort ascending
      await actions.clickTableColumnSortButton(1);

      const { tableCellsValues: ascTableCellsValues } =
        table.getMetaData('componentTemplatesTable');
      const ascUsageCountValues = ascTableCellsValues.map((row) => row[2]);
      expect(ascUsageCountValues).toEqual(['Not in use', '1']);

      // Sort descending
      await actions.clickTableColumnSortButton(1);

      const { tableCellsValues: descTableCellsValues } =
        table.getMetaData('componentTemplatesTable');
      const descUsageCountValues = descTableCellsValues.map((row) => row[2]);
      expect(descUsageCountValues).toEqual(['1', 'Not in use']);

      // Revert sorting back on Name column to not impact the rest of the tests
      await actions.clickTableColumnSortButton(0);
    });

    test('Hides deprecated component templates by default', async () => {
      const { component, find } = testBed;

      // Initially the switch is off so we should not see any deprecated component templates
      let deprecatedList = find('deprecatedComponentTemplateBadge');
      expect(deprecatedList.length).toBe(0);

      testBed.find('componentTemplatesFiltersButton').simulate('click');
      testBed.find('componentTemplates--deprecatedFilter').simulate('click');

      component.update();

      // Now we should see all deprecated component templates
      deprecatedList = find('deprecatedComponentTemplateBadge');
      expect(deprecatedList.length).toBe(1);
    });

    test('should reload the component templates data', async () => {
      const { component, actions } = testBed;

      await act(async () => {
        actions.clickReloadButton();
      });

      component.update();

      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/component_templates`,
        expect.anything()
      );
    });

    test('should delete a component template', async () => {
      const { actions, component } = testBed;
      const { name: componentTemplateName } = componentTemplate1;

      await act(async () => {
        actions.clickDeleteActionAt(0);
      });

      // We need to read the document "body" as the modal is added there and not inside
      // the component DOM tree.
      const modal = document.body.querySelector(
        '[data-test-subj="deleteComponentTemplatesConfirmation"]'
      );
      const confirmButton: HTMLButtonElement | null = modal!.querySelector(
        '[data-test-subj="confirmModalConfirmButton"]'
      );

      expect(modal).not.toBe(null);
      expect(modal!.textContent).toContain('Delete component template');

      httpRequestsMockHelpers.setDeleteComponentTemplateResponse(componentTemplateName, {
        itemsDeleted: [componentTemplateName],
        errors: [],
      });

      await act(async () => {
        confirmButton!.click();
      });

      component.update();

      expect(httpSetup.delete).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/component_templates/${componentTemplateName}`,
        expect.anything()
      );
    });
  });

  describe('if filter is set, component templates are filtered', () => {
    test('search value is set if url param is set', async () => {
      const filter = 'usedBy=(test_index_template_1)';
      await act(async () => {
        testBed = await setup(httpSetup, { filter });
      });

      testBed.component.update();

      const { table } = testBed;
      const search = testBed.actions.getSearchValue();
      expect(search).toBe(filter);

      const { rows } = table.getMetaData('componentTemplatesTable');
      expect(rows.length).toBe(1);
    });
  });

  describe('No component templates', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadComponentTemplatesResponse([]);

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    test('should display an empty prompt', async () => {
      const { exists, find } = testBed;

      expect(exists('sectionLoading')).toBe(false);
      expect(exists('emptyList')).toBe(true);
      expect(find('emptyList.title').text()).toEqual('Start by creating a component template');
    });
  });

  describe('Error handling', () => {
    beforeEach(async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setLoadComponentTemplatesResponse(undefined, error);

      await act(async () => {
        testBed = await setup(httpSetup);
      });

      testBed.component.update();
    });

    test('should render an error message if error fetching component templates', async () => {
      const { exists, find } = testBed;

      expect(exists('componentTemplatesLoadError')).toBe(true);
      // The text here looks weird because the child elements' text values (title and description)
      // are concatenated when we retrive the error element's text value.
      expect(find('componentTemplatesLoadError').text()).toContain(
        'Error loading component templatesInternal server error'
      );
    });
  });
});
