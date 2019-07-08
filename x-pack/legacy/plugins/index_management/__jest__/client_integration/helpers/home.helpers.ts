/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBed, TestBedConfig } from '../../../../../../test_utils';
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
    selectTab: (tab: 'indices' | 'index templates') => void;
    clickReloadButton: () => void;
  };
}

export const setup = async (): Promise<IdxMgmtHomeTestBed> => {
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const selectTab = (tab: 'indices' | 'index templates') => {
    const tabs = ['indices', 'index templates'];

    testBed
      .find('tab')
      .at(tabs.indexOf(tab))
      .simulate('click');
  };

  const clickReloadButton = () => {
    const { find } = testBed;
    find('reloadButton').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      selectTab,
      clickReloadButton,
    },
  };
};

type IdxMgmtTestSubjects = TestSubjects;

export type TestSubjects =
  | 'appTitle'
  | 'cell'
  | 'documentationLink'
  | 'emptyPrompt'
  | 'indicesList'
  | 'reloadButton'
  | 'row'
  | 'sectionLoading'
  | 'tab'
  | 'templatesList'
  | 'templatesTable';
