/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { registerTestBed, TestBed, TestBedConfig } from '../../../../../../test_utils';
import { WatchEdit } from '../../../public/sections/watch_edit/components/watch_edit';
import { ROUTES, WATCH_TYPES } from '../../../common/constants';
import { registerRouter } from '../../../public/lib/navigation';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    onRouter: router => registerRouter(router),
    initialEntries: [`${ROUTES.API_ROOT}/watches/new-watch/${WATCH_TYPES.JSON}`],
    componentRoutePath: `${ROUTES.API_ROOT}/watches/new-watch/:type`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WatchEdit, testBedConfig);

export interface WatchCreateJsonTestBed extends TestBed<WatchCreateJsonTestSubjects> {
  actions: {
    selectTab: (tab: 'edit' | 'simulate') => void;
    clickSubmitButton: () => void;
    clickSimulateButton: () => void;
  };
}

export const setup = async (): Promise<WatchCreateJsonTestBed> => {
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const selectTab = (tab: 'edit' | 'simulate') => {
    const tabs = ['edit', 'simulate'];

    testBed
      .find('tab')
      .at(tabs.indexOf(tab))
      .simulate('click');
  };

  const clickSubmitButton = () => {
    testBed.find('saveWatchButton').simulate('click');
  };

  const clickSimulateButton = () => {
    testBed.find('simulateWatchButton').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      selectTab,
      clickSubmitButton,
      clickSimulateButton,
    },
  };
};

type WatchCreateJsonTestSubjects = TestSubjects;

export type TestSubjects =
  | 'actionModesSelect'
  | 'idInput'
  | 'ignoreConditionSwitch'
  | 'jsonEditor'
  | 'jsonWatchForm'
  | 'jsonWatchSimulateForm'
  | 'nameInput'
  | 'pageTitle'
  | 'saveWatchButton'
  | 'scheduledTimeInput'
  | 'sectionError'
  | 'sectionLoading'
  | 'simulateResultsFlyout'
  | 'simulateResultsFlyoutTitle'
  | 'simulateWatchButton'
  | 'tab'
  | 'triggeredTimeInput';
