/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';

import { breadcrumbService, IndexManagementBreadcrumb } from '../../../../services/breadcrumbs';
import { setupEnvironment } from './helpers';
import { API_BASE_PATH } from './helpers/constants';
import {
  clickUsageCountHeader,
  componentTemplates,
  getTable,
  getUsageCount,
  renderComponentTemplateList,
} from './helpers/component_template_list.helpers';

describe('<ComponentTemplateList />', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let coreStart: ReturnType<(typeof coreMock)['createStart']>;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    const env = setupEnvironment();
    httpSetup = env.httpSetup;
    httpRequestsMockHelpers = env.httpRequestsMockHelpers;
    coreStart = coreMock.createStart();
  });

  test('updates the breadcrumbs to component templates', async () => {
    jest.spyOn(breadcrumbService, 'setBreadcrumbs');
    httpRequestsMockHelpers.setLoadComponentTemplatesResponse([]);
    renderComponentTemplateList(httpSetup, coreStart);
    await screen.findByTestId('emptyList');
    expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
      IndexManagementBreadcrumb.componentTemplates
    );
  });

  describe('With component templates', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadComponentTemplatesResponse(componentTemplates);
      renderComponentTemplateList(httpSetup, coreStart);
      await screen.findByTestId('componentTemplatesTable');
    });

    test('should render the list view', async () => {
      const filtered = componentTemplates.filter(({ isDeprecated }) => !isDeprecated);
      const table = getTable();
      await waitFor(() => expect(table.getRows()).toHaveLength(filtered.length));
      const rows = table.getRows();
      const names = rows.map((row) => within(row).getByTestId('templateDetailsLink').textContent);
      expect(names).toEqual(filtered.map(({ name }) => name));
      expect(screen.queryByTestId('deprecatedComponentTemplateBadge')).not.toBeInTheDocument();
    });

    test('should sort "Usage count" column by number', async () => {
      const table = getTable();
      clickUsageCountHeader();
      let rows = table.getRows();
      const usageNumbers = rows.map((row) => getUsageCount(row));

      clickUsageCountHeader();
      rows = table.getRows();
      const usageNumbers2 = rows.map((row) => getUsageCount(row));

      expect(usageNumbers.length).toBe(2); // deprecated row filtered out
      expect(usageNumbers2.length).toBe(2);
      // Sort toggle should reverse order
      expect(usageNumbers2).toEqual([...usageNumbers].reverse());
    });

    test('Hides deprecated component templates by default and shows when filtered on', async () => {
      await waitFor(() =>
        expect(screen.queryByTestId('deprecatedComponentTemplateBadge')).not.toBeInTheDocument()
      );

      fireEvent.click(screen.getByTestId('componentTemplatesFiltersButton'));
      fireEvent.click(screen.getByTestId('componentTemplates--deprecatedFilter'));

      await waitFor(() =>
        expect(screen.getAllByTestId('deprecatedComponentTemplateBadge')).toHaveLength(1)
      );
    });

    test('should reload the component templates data', async () => {
      fireEvent.click(screen.getByTestId('reloadButton'));
      await waitFor(() => {
        expect(httpSetup.get).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/component_templates`,
          expect.anything()
        );
      });
    });

    test('should delete a component template', async () => {
      const table = getTable();
      const row = table.getRowByCellText(componentTemplates[0].name) as HTMLElement;
      fireEvent.click(within(row).getByRole('checkbox'));
      const bulkDeleteButton = screen.getByTestId('deleteComponentTemplatexButton');
      fireEvent.click(bulkDeleteButton);

      const modal = await screen.findByTestId('deleteComponentTemplatesConfirmation');
      const confirmButton = within(modal).getByTestId('confirmModalConfirmButton');

      httpRequestsMockHelpers.setDeleteComponentTemplateResponse(componentTemplates[0].name, {
        itemsDeleted: [componentTemplates[0].name],
        errors: [],
      });

      fireEvent.click(confirmButton);

      await waitFor(() => expect(httpSetup.delete).toHaveBeenCalled());
    });
  });

  describe('if filter is set, component templates are filtered', () => {
    test('search value is set if url param is set', async () => {
      const filter = 'usedBy=(test_index_template_1)';
      httpRequestsMockHelpers.setLoadComponentTemplatesResponse(componentTemplates);
      renderComponentTemplateList(httpSetup, coreStart, { filter });
      await screen.findByTestId('componentTemplatesTable');

      const table = getTable();
      await waitFor(() => expect(table.getRows()).toHaveLength(1));
      const rows = table.getRows();
      const onlyRow = rows.length === 1 ? rows[0] : null;

      if (!onlyRow) {
        throw new Error('Expected to find only one row in the component templates table');
      }

      expect(within(onlyRow).getByTestId('templateDetailsLink')).toHaveTextContent(
        'test_component_template_2'
      );
    });
  });

  describe('No component templates', () => {
    test('should display an empty prompt', async () => {
      httpRequestsMockHelpers.setLoadComponentTemplatesResponse([]);
      renderComponentTemplateList(httpSetup, coreStart);
      const emptyPrompt = await screen.findByTestId('emptyList');
      expect(emptyPrompt).toBeInTheDocument();
      expect(within(emptyPrompt).getByTestId('title')).toHaveTextContent(
        'Start by creating a component template'
      );
    });
  });

  describe('Error handling', () => {
    test('should render an error message if error fetching component templates', async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };
      httpRequestsMockHelpers.setLoadComponentTemplatesResponse(undefined, error);
      renderComponentTemplateList(httpSetup, coreStart);

      const errorCallout = await screen.findByTestId('componentTemplatesLoadError');
      expect(errorCallout).toBeInTheDocument();
      expect(errorCallout.textContent).toContain('Error loading component templates');
    });
  });
});
