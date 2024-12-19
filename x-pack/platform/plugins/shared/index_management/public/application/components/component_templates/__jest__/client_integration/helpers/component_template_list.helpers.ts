/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { HttpSetup } from '@kbn/core/public';

import {
  registerTestBed,
  TestBed,
  AsyncTestBedConfig,
  findTestSubject,
  nextTick,
} from '@kbn/test-jest-helpers';
import { BASE_PATH } from '../../../../../../../common';
import { WithAppDependencies } from './setup_environment';
import { ComponentTemplateList } from '../../../component_template_list/component_template_list';

const getTestBedConfig = (props?: any): AsyncTestBedConfig => ({
  memoryRouter: {
    initialEntries: [`${BASE_PATH}component_templates`],
    componentRoutePath: `${BASE_PATH}component_templates`,
  },
  doMountAsync: true,
  defaultProps: props,
});

export type ComponentTemplateListTestBed = TestBed<ComponentTemplateTestSubjects> & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed) => {
  const { find, component } = testBed;

  /**
   * User Actions
   */
  const clickReloadButton = () => {
    find('reloadButton').simulate('click');
  };

  const clickComponentTemplateAt = async (index: number) => {
    const { table, router } = testBed;
    const { rows } = table.getMetaData('componentTemplatesTable');
    const componentTemplateLink = findTestSubject(
      rows[index].reactWrapper,
      'componentTemplateDetailsLink'
    );

    await act(async () => {
      const { href } = componentTemplateLink.props();
      router.navigateTo(href!);
      await nextTick();
      component.update();
    });
  };

  const clickTableColumnSortButton = async (index: number) => {
    await act(async () => {
      find('tableHeaderSortButton').at(index).simulate('click');
    });
    component.update();
  };

  const clickDeleteActionAt = (index: number) => {
    const { table } = testBed;

    const { rows } = table.getMetaData('componentTemplatesTable');
    const deleteButton = findTestSubject(rows[index].reactWrapper, 'deleteComponentTemplateButton');

    deleteButton.simulate('click');
  };

  const getSearchValue = () => {
    return find('componentTemplatesSearch').prop('defaultValue');
  };

  return {
    clickReloadButton,
    clickComponentTemplateAt,
    clickDeleteActionAt,
    clickTableColumnSortButton,
    getSearchValue,
  };
};

export const setup = async (
  httpSetup: HttpSetup,
  props?: any
): Promise<ComponentTemplateListTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(ComponentTemplateList, httpSetup),
    getTestBedConfig(props)
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};

export type ComponentTemplateTestSubjects =
  | 'componentTemplatesTable'
  | 'componentTemplateDetails'
  | 'componentTemplateDetails.title'
  | 'deleteComponentTemplatesConfirmation'
  | 'emptyList'
  | 'emptyList.title'
  | 'sectionLoading'
  | 'componentTemplatesLoadError'
  | 'deleteComponentTemplateButton'
  | 'reloadButton'
  | 'componentTemplatesSearch'
  | 'deprecatedComponentTemplateBadge'
  | 'componentTemplatesFiltersButton'
  | 'componentTemplates--deprecatedFilter';
