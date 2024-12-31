/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { HttpSetup } from '@kbn/core/public';

import { registerTestBed, TestBed, AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { ManageProcessors } from '../../../public/application/sections';
import { WithAppDependencies } from './setup_environment';
import { getManageProcessorsPath, ROUTES } from '../../../public/application/services/navigation';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [getManageProcessorsPath()],
    componentRoutePath: ROUTES.manageProcessors,
  },
  doMountAsync: true,
};

export type ManageProcessorsTestBed = TestBed<ManageProcessorsTestSubjects> & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed) => {
  const { component, find, form } = testBed;

  const clickDeleteDatabaseButton = async (index: number) => {
    const allDeleteButtons = find('deleteGeoipDatabaseButton');
    const deleteButton = allDeleteButtons.at(index);
    await act(async () => {
      deleteButton.simulate('click');
    });

    component.update();
  };

  const confirmDeletingDatabase = async () => {
    await act(async () => {
      form.setInputValue('geoipDatabaseConfirmation', 'delete');
    });

    component.update();

    const confirmButton: HTMLButtonElement | null = document.body.querySelector(
      '[data-test-subj="deleteGeoipDatabaseSubmit"]'
    );

    expect(confirmButton).not.toBe(null);
    expect(confirmButton!.disabled).toBe(false);
    expect(confirmButton!.textContent).toContain('Delete');

    await act(async () => {
      confirmButton!.click();
    });

    component.update();
  };

  const clickAddDatabaseButton = async () => {
    const button = find('addGeoipDatabaseButton');
    expect(button).not.toBe(undefined);
    await act(async () => {
      button.simulate('click');
    });

    component.update();
  };

  const fillOutDatabaseValues = async (
    databaseType: string,
    databaseName: string,
    maxmind?: string
  ) => {
    await act(async () => {
      form.setSelectValue('databaseTypeSelect', databaseType);
    });
    component.update();

    if (maxmind) {
      await act(async () => {
        form.setInputValue('maxmindField', maxmind);
      });
    }
    await act(async () => {
      form.setSelectValue('databaseNameSelect', databaseName);
    });

    component.update();
  };

  const confirmAddingDatabase = async () => {
    const confirmButton: HTMLButtonElement | null = document.body.querySelector(
      '[data-test-subj="addGeoipDatabaseSubmit"]'
    );

    expect(confirmButton).not.toBe(null);
    expect(confirmButton!.disabled).toBe(false);

    await act(async () => {
      confirmButton!.click();
    });

    component.update();
  };

  return {
    clickDeleteDatabaseButton,
    confirmDeletingDatabase,
    clickAddDatabaseButton,
    fillOutDatabaseValues,
    confirmAddingDatabase,
  };
};

export const setup = async (httpSetup: HttpSetup): Promise<ManageProcessorsTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(ManageProcessors, httpSetup),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};

export type ManageProcessorsTestSubjects =
  | 'manageProcessorsTitle'
  | 'addGeoipDatabaseForm'
  | 'addGeoipDatabaseButton'
  | 'geoipDatabaseList'
  | 'databaseTypeSelect'
  | 'maxmindField'
  | 'databaseNameSelect'
  | 'addGeoipDatabaseSubmit'
  | 'deleteGeoipDatabaseButton'
  | 'geoipDatabaseConfirmation'
  | 'geoipEmptyListPrompt'
  | 'geoipListLoadingError';
