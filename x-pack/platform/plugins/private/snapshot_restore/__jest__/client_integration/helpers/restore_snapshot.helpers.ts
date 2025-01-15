/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act } from 'react-dom/test-utils';

import { HttpSetup } from '@kbn/core/public';
import { registerTestBed, TestBed, AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { RestoreSnapshot } from '../../../public/application/sections/restore_snapshot';
import { WithAppDependencies } from './setup_environment';
import { REPOSITORY_NAME, SNAPSHOT_NAME } from './constant';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`/restore/${REPOSITORY_NAME}/${SNAPSHOT_NAME}`],
    componentRoutePath: '/restore/:repositoryName?/:snapshotId*',
  },
  doMountAsync: true,
};

const setupActions = (testBed: TestBed<RestoreSnapshotFormTestSubject>) => {
  const { find, component, form, exists } = testBed;

  return {
    findDataStreamCallout() {
      return find('dataStreamWarningCallOut');
    },

    canGoToADifferentStep() {
      const canGoNext = find('restoreSnapshotsForm.nextButton').props().disabled !== true;
      const canGoPrevious = exists('restoreSnapshotsForm.backButton')
        ? find('restoreSnapshotsForm.nextButton').props().disabled !== true
        : true;
      return canGoNext && canGoPrevious;
    },

    toggleModifyIndexSettings() {
      act(() => {
        form.toggleEuiSwitch('modifyIndexSettingsSwitch');
      });
      component.update();
    },

    toggleGlobalState() {
      act(() => {
        form.toggleEuiSwitch('includeGlobalStateSwitch');
      });

      component.update();
    },

    async toggleFeatureState() {
      await act(async () => {
        form.toggleEuiSwitch('includeFeatureStatesSwitch');
      });

      component.update();
    },

    toggleIncludeAliases() {
      act(() => {
        form.toggleEuiSwitch('includeAliasesSwitch');
      });

      component.update();
    },

    goToStep(step: number) {
      while (--step > 0) {
        find('nextButton').simulate('click');
      }
      component.update();
    },

    async clickRestore() {
      await act(async () => {
        find('restoreButton').simulate('click');
      });
      component.update();
    },
  };
};

type Actions = ReturnType<typeof setupActions>;

export type RestoreSnapshotTestBed = TestBed<RestoreSnapshotFormTestSubject> & {
  actions: Actions;
};

export const setup = async (httpSetup: HttpSetup): Promise<RestoreSnapshotTestBed> => {
  const initTestBed = registerTestBed<RestoreSnapshotFormTestSubject>(
    WithAppDependencies(RestoreSnapshot, httpSetup),
    testBedConfig
  );

  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: setupActions(testBed),
  };
};

export type RestoreSnapshotFormTestSubject =
  | 'snapshotRestoreStepLogistics'
  | 'includeGlobalStateSwitch'
  | 'includeAliasesSwitch'
  | 'featureStatesDropdown'
  | 'includeFeatureStatesSwitch'
  | 'toggleIncludeNone'
  | 'nextButton'
  | 'restoreButton'
  | 'systemIndicesInfoCallOut'
  | 'noFeatureStatesCallout'
  | 'dataStreamWarningCallOut'
  | 'restoreSnapshotsForm.backButton'
  | 'restoreSnapshotsForm.nextButton'
  | 'modifyIndexSettingsSwitch';
