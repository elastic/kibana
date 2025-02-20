/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';
import { setupEnvironment } from '../../helpers';
import { systemIndicesMigrationStatus, systemIndicesMigrationErrorStatus } from './mocks';

describe('Overview - Migrate system indices - Flyout', () => {
  let testBed: OverviewTestBed;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;

    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus(systemIndicesMigrationStatus);

    await act(async () => {
      testBed = await setupOverviewPage(httpSetup);
    });

    testBed.component.update();
  });

  test('shows correct features in flyout table', async () => {
    const { actions, table } = testBed;

    await actions.clickViewSystemIndicesState();

    const { tableCellsValues } = table.getMetaData('flyoutDetails');

    expect(tableCellsValues.length).toBe(systemIndicesMigrationStatus.features.length);
    expect(tableCellsValues).toMatchSnapshot();
  });

  test('shows migration errors inline within the table row', async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus(systemIndicesMigrationErrorStatus);

    await act(async () => {
      testBed = await setupOverviewPage(httpSetup);
    });

    const { component, actions, table } = testBed;

    component.update();

    await actions.clickViewSystemIndicesState();

    const { rows } = table.getMetaData('flyoutDetails');

    expect(rows[0].columns[1].value).toBe('Migration failed');

    await act(async () => {
      rows[0].reactWrapper.find('button').simulate('click');
    });

    component.update();

    const { rows: resultRows } = table.getMetaData('flyoutDetails');

    // Should contain two errors about the migration
    // We expect results to be on the second row, given that the first row is used as an expander
    // and the second holds the collapsible content
    expect(resultRows[1].reactWrapper.text()).toContain('.kibanamapper_parsing_exception');
    expect(resultRows[1].reactWrapper.text()).toContain('.logsmapper_parsing_exception');
  });
});
