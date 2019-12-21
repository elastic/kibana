/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton } from '@elastic/eui';
import { registerTestBed, TestBed } from '../../../../../../test_utils';
import { WithProviders } from './providers';

const initTestBed = registerTestBed<RepositoryDetailTestSubjects>(WithProviders(EuiButton), {
  doMountAsync: true,
});

export interface RepositoryDetailTestBed extends TestBed<RepositoryDetailTestSubjects> {
  actions: {
    clickCleanupRepositoryButton: () => void;
    getResponseText: () => void;
  };
}

export const setup = async (): Promise<RepositoryDetailTestBed> => {
  const testBed = await initTestBed();

  // User actions
  const clickCleanupRepositoryButton = () => {
    testBed.find('cleanupRepositoryButton').simulate('click');
  };

  const getResponseText = () => {
    //
  };
  return {
    ...testBed,
    actions: {
      clickCleanupRepositoryButton,
      getResponseText,
    },
  };
};

export type RepositoryDetailTestSubjects = TestSubjects;

type TestSubjects = 'cleanupRepositoryButton' | `cleanupRepositoryResponseEditor`;
