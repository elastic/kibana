/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';
import {
  registerTestBed,
  TestBed,
  TestBedConfig,
  findTestSubject,
  nextTick,
} from '../../../../../../test_utils';
import { IndexManagementHome } from '../../../public/sections/home';
import { BASE_PATH } from '../../../common/constants';
import { indexManagementStore } from '../../../public/store';

const testBedConfig: TestBedConfig = {
  store: indexManagementStore,
  memoryRouter: {
    initialEntries: [`${BASE_PATH}indices`],
    componentRoutePath: `${BASE_PATH}:section(indices|templates)`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(IndexManagementHome, testBedConfig);

export interface IdxMgmtHomeTestBed extends TestBed<IdxMgmtTestSubjects> {
  actions: {
    selectHomeTab: (tab: 'indices' | 'index templates') => void;
    selectDetailsTab: (tab: 'summary' | 'settings' | 'mappings' | 'aliases') => void;
    clickReloadButton: () => void;
    clickTemplateActionAt: (index: number, action: 'delete') => void;
    clickTemplateAt: (index: number) => void;
    clickCloseDetailsButton: () => void;
  };
}

export const setup = async (): Promise<IdxMgmtHomeTestBed> => {
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const selectHomeTab = (tab: 'indices' | 'index templates') => {
    const tabs = ['indices', 'index templates'];

    testBed
      .find('tab')
      .at(tabs.indexOf(tab))
      .simulate('click');
  };

  const selectDetailsTab = (tab: 'summary' | 'settings' | 'mappings' | 'aliases') => {
    const tabs = ['summary', 'settings', 'mappings', 'aliases'];

    testBed
      .find('templateDetails.tab')
      .at(tabs.indexOf(tab))
      .simulate('click');
  };

  const clickReloadButton = () => {
    const { find } = testBed;
    find('reloadButton').simulate('click');
  };

  const clickTemplateActionAt = async (index: number, action: 'delete') => {
    const { component, table } = testBed;
    const { rows } = table.getMetaData('templatesTable');
    const currentRow = rows[index];
    const lastColumn = currentRow.columns[currentRow.columns.length - 1].reactWrapper;
    const button = findTestSubject(lastColumn, `${action}TemplateButton`);

    // @ts-ignore (remove when react 16.9.0 is released)
    await act(async () => {
      button.simulate('click');
      component.update();
    });
  };

  const clickTemplateAt = async (index: number) => {
    const { component, table, router } = testBed;
    const { rows } = table.getMetaData('templatesTable');
    const templateLink = findTestSubject(rows[index].reactWrapper, 'templateDetailsLink');

    // @ts-ignore (remove when react 16.9.0 is released)
    await act(async () => {
      const { href } = templateLink.props();
      router.navigateTo(href!);
      await nextTick();
      component.update();
    });
  };

  const clickCloseDetailsButton = () => {
    const { find } = testBed;

    find('closeDetailsButton').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      selectHomeTab,
      selectDetailsTab,
      clickReloadButton,
      clickTemplateActionAt,
      clickTemplateAt,
      clickCloseDetailsButton,
    },
  };
};

type IdxMgmtTestSubjects = TestSubjects;

export type TestSubjects =
  | 'aliasesTab'
  | 'appTitle'
  | 'cell'
  | 'closeDetailsButton'
  | 'deleteSystemTemplateCallOut'
  | 'deleteTemplateButton'
  | 'deleteTemplatesButton'
  | 'deleteTemplatesConfirmation'
  | 'documentationLink'
  | 'emptyPrompt'
  | 'mappingsTab'
  | 'indicesList'
  | 'reloadButton'
  | 'row'
  | 'sectionError'
  | 'sectionLoading'
  | 'settingsTab'
  | 'summaryTab'
  | 'summaryTitle'
  | 'systemTemplatesSwitch'
  | 'tab'
  | 'templateDetails'
  | 'templateDetails.deleteTemplateButton'
  | 'templateDetails.sectionLoading'
  | 'templateDetails.tab'
  | 'templateDetails.title'
  | 'templatesList'
  | 'templatesTable';
