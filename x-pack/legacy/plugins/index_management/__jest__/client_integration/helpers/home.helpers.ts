/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import {
  registerTestBed,
  TestBed,
  TestBedConfig,
  findTestSubject,
  nextTick,
} from '../../../../../../test_utils';
import { IndexManagementHome } from '../../../public/app/sections/home';
import { BASE_PATH } from '../../../common/constants';
import { indexManagementStore } from '../../../public/app/store';
import { Template } from '../../../common/types';

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
  findAction: (action: 'edit' | 'clone' | 'delete') => ReactWrapper;
  actions: {
    selectHomeTab: (tab: 'indicesTab' | 'templatesTab') => void;
    selectDetailsTab: (tab: 'summary' | 'settings' | 'mappings' | 'aliases') => void;
    clickReloadButton: () => void;
    clickTemplateAction: (name: Template['name'], action: 'edit' | 'clone' | 'delete') => void;
    clickTemplateAt: (index: number) => void;
    clickCloseDetailsButton: () => void;
    clickActionMenu: (name: Template['name']) => void;
  };
}

export const setup = async (): Promise<IdxMgmtHomeTestBed> => {
  const testBed = await initTestBed();

  /**
   * Additional helpers
   */
  const findAction = (action: 'edit' | 'clone' | 'delete') => {
    const actions = ['edit', 'clone', 'delete'];
    const { component } = testBed;

    return component.find('.euiContextMenuItem').at(actions.indexOf(action));
  };

  /**
   * User Actions
   */

  const selectHomeTab = (tab: 'indicesTab' | 'templatesTab') => {
    testBed.find(tab).simulate('click');
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

  const clickActionMenu = async (templateName: Template['name']) => {
    const { component } = testBed;

    // When a table has > 2 actions, EUI displays an overflow menu with an id "<template_name>-actions"
    // The template name may contain a period (.) so we use bracket syntax for selector
    component.find(`div[id="${templateName}-actions"] button`).simulate('click');
  };

  const clickTemplateAction = (
    templateName: Template['name'],
    action: 'edit' | 'clone' | 'delete'
  ) => {
    const actions = ['edit', 'clone', 'delete'];
    const { component } = testBed;

    clickActionMenu(templateName);

    component
      .find('.euiContextMenuItem')
      .at(actions.indexOf(action))
      .simulate('click');
  };

  const clickTemplateAt = async (index: number) => {
    const { component, table, router } = testBed;
    const { rows } = table.getMetaData('templateTable');
    const templateLink = findTestSubject(rows[index].reactWrapper, 'templateDetailsLink');

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
    findAction,
    actions: {
      selectHomeTab,
      selectDetailsTab,
      clickReloadButton,
      clickTemplateAction,
      clickTemplateAt,
      clickCloseDetailsButton,
      clickActionMenu,
    },
  };
};

type IdxMgmtTestSubjects = TestSubjects;

export type TestSubjects =
  | 'aliasesTab'
  | 'appTitle'
  | 'cell'
  | 'closeDetailsButton'
  | 'createTemplateButton'
  | 'deleteSystemTemplateCallOut'
  | 'deleteTemplateButton'
  | 'deleteTemplatesConfirmation'
  | 'documentationLink'
  | 'emptyPrompt'
  | 'manageTemplateButton'
  | 'mappingsTab'
  | 'noAliasesCallout'
  | 'noMappingsCallout'
  | 'noSettingsCallout'
  | 'indicesList'
  | 'indicesTab'
  | 'reloadButton'
  | 'row'
  | 'sectionError'
  | 'sectionLoading'
  | 'settingsTab'
  | 'summaryTab'
  | 'summaryTitle'
  | 'systemTemplatesSwitch'
  | 'templateDetails'
  | 'templateDetails.manageTemplateButton'
  | 'templateDetails.sectionLoading'
  | 'templateDetails.tab'
  | 'templateDetails.title'
  | 'templateList'
  | 'templateTable'
  | 'templatesTab';
