/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import {
  registerTestBed,
  findTestSubject,
  TestBed,
  AsyncTestBedConfig,
} from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';
import { WatchListPage } from '../../../public/application/sections/watch_list_page';
import { ROUTES, REFRESH_INTERVALS } from '../../../common/constants';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`${ROUTES.API_ROOT}/watches`],
  },
  doMountAsync: true,
};

export interface WatchListTestBed extends TestBed<WatchListTestSubjects> {
  actions: {
    selectWatchAt: (index: number) => Promise<void>;
    clickWatchActionAt: (index: number, action: 'delete' | 'edit') => Promise<void>;
    searchWatches: (term: string) => Promise<void>;
    advanceTimeToTableRefresh: () => Promise<void>;
  };
}

export const setup = async (httpSetup: HttpSetup): Promise<WatchListTestBed> => {
  const initTestBed = registerTestBed(WithAppDependencies(WatchListPage, httpSetup), testBedConfig);
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const selectWatchAt = async (index: number) => {
    const { rows } = testBed.table.getMetaData('watchesTable');
    const row = rows[index];
    const checkBox = row.reactWrapper.find('input').hostNodes();

    await act(async () => {
      checkBox.simulate('change', { target: { checked: true } });
    });
    testBed.component.update();
  };

  const clickWatchActionAt = async (index: number, action: 'delete' | 'edit') => {
    const { component, table } = testBed;
    const { rows } = table.getMetaData('watchesTable');
    const currentRow = rows[index];
    const lastColumn = currentRow.columns[currentRow.columns.length - 1].reactWrapper;
    const button = findTestSubject(lastColumn, `${action}WatchButton`);

    await act(async () => {
      button.simulate('click');
    });
    component.update();
  };

  const searchWatches = async (term: string) => {
    const { find, component } = testBed;
    const searchInput = find('watchesTableContainer').find('input.euiFieldSearch');

    // Enter input into the search box
    // @ts-ignore
    searchInput.instance().value = term;

    await act(async () => {
      searchInput.simulate('keyup', { key: 'Enter', keyCode: 13, which: 13 });
    });

    component.update();
  };

  const advanceTimeToTableRefresh = async () => {
    const { component } = testBed;
    await act(async () => {
      // Advance timers to simulate another request
      jest.advanceTimersByTime(REFRESH_INTERVALS.WATCH_LIST);
    });
    component.update();
  };

  return {
    ...testBed,
    actions: {
      selectWatchAt,
      clickWatchActionAt,
      searchWatches,
      advanceTimeToTableRefresh,
    },
  };
};

type WatchListTestSubjects = TestSubjects;

export type TestSubjects =
  | 'appTitle'
  | 'documentationLink'
  | 'watchesTable'
  | 'watcherListSearchError'
  | 'cell'
  | 'row'
  | 'deleteWatchButton'
  | 'createWatchButton'
  | 'emptyPrompt'
  | 'emptyPrompt.createWatchButton'
  | 'editWatchButton'
  | 'watchesTableContainer';
