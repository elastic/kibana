/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { registerTestBed, TestBed, TestBedConfig } from '../../../../../../test_utils';
import { WatchEdit } from '../../../public/np_ready/application/sections/watch_edit/components/watch_edit';
import { ROUTES } from '../../../common/constants';
import { registerRouter } from '../../../public/np_ready/application/lib/navigation';
import { WATCH_ID } from './constants';
import { withAppContext } from './app_context.mock';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    onRouter: router => registerRouter(router),
    initialEntries: [`${ROUTES.API_ROOT}/watches/watch/${WATCH_ID}/edit`],
    componentRoutePath: `${ROUTES.API_ROOT}/watches/watch/:id/edit`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(withAppContext(WatchEdit), testBedConfig);

export interface WatchEditTestBed extends TestBed<WatchEditSubjects> {
  actions: {
    clickSubmitButton: () => void;
  };
}

export const setup = async (): Promise<WatchEditTestBed> => {
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const clickSubmitButton = () => {
    testBed.find('saveWatchButton').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      clickSubmitButton,
    },
  };
};

type WatchEditSubjects = TestSubjects;

export type TestSubjects =
  | 'idInput'
  | 'jsonWatchForm'
  | 'nameInput'
  | 'pageTitle'
  | 'thresholdWatchForm'
  | 'watchTimeFieldSelect';
