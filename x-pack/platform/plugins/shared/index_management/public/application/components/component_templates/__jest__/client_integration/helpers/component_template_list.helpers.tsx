/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { i18nServiceMock, themeServiceMock, analyticsServiceMock } from '@kbn/core/public/mocks';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { EuiTableTestHarness } from '@kbn/test-eui-helpers';
import type { CoreStart, HttpSetup } from '@kbn/core/public';

import type { ComponentTemplateListItem } from '../../../shared_imports';
import { ComponentTemplateList } from '../../../component_template_list/component_template_list';
import { WithAppDependencies } from './setup_environment';
import { BASE_PATH } from '../../../../../../../common';

const startServicesMock = {
  i18n: i18nServiceMock.createStartContract(),
  theme: themeServiceMock.createStartContract(),
  analytics: analyticsServiceMock.createAnalyticsServiceStart(),
};

export const renderComponentTemplateList = (
  httpSetup: HttpSetup,
  coreStart: CoreStart,
  options: { filter?: string } = {}
) => {
  const route = `${BASE_PATH}/component_templates${
    options.filter ? `?filter=${options.filter}` : ''
  }`;
  const ListWithRouter = () => (
    <MemoryRouter initialEntries={[route]}>
      <Route
        path={`${BASE_PATH}/component_templates`}
        render={(props) => <ComponentTemplateList {...props} filter={options.filter} />}
      />
    </MemoryRouter>
  );

  return render(
    <KibanaRenderContextProvider {...startServicesMock}>
      {React.createElement(WithAppDependencies(ListWithRouter, httpSetup, coreStart))}
    </KibanaRenderContextProvider>
  );
};

export const getTable = () => new EuiTableTestHarness('componentTemplatesTable');

export const clickUsageCountHeader = () => {
  const usageHeader = screen.getByRole('columnheader', { name: /Usage count/i });
  const sortButton = within(usageHeader).getByRole('button');
  fireEvent.click(sortButton);
};

export const getUsageCount = (row: HTMLElement) => {
  // Avoid querying all cells and indexing into them.
  // In this table, the "Usage count" cell is the only cell whose full text is either a number or "Not in use".
  const usageCell = within(row).getByRole('cell', { name: /^(Not in use|\d+)$/ });
  const text = (usageCell.textContent || '').trim();
  return text === 'Not in use' ? 0 : Number(text);
};

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

export const componentTemplates = [componentTemplate1, componentTemplate2, componentTemplate3];
