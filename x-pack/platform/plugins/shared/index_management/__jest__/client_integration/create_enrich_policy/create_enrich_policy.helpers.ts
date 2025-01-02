/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBed, AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';
import { EnrichPolicyCreate } from '../../../public/application/sections/enrich_policy_create';
import { indexManagementStore } from '../../../public/application/store';
import { WithAppDependencies, services, TestSubjects } from '../helpers';

const testBedConfig: AsyncTestBedConfig = {
  store: () => indexManagementStore(services as any),
  memoryRouter: {
    initialEntries: [`/enrich_policies/create`],
    componentRoutePath: `/:section(enrich_policies)/create`,
  },
  doMountAsync: true,
};

export interface CreateEnrichPoliciesTestBed extends TestBed<TestSubjects> {
  actions: {
    clickNextButton: () => Promise<void>;
    clickBackButton: () => Promise<void>;
    clickRequestTab: () => Promise<void>;
    clickCreatePolicy: () => Promise<void>;
    completeConfigurationStep: ({ indices }: { indices?: string }) => Promise<void>;
    completeFieldsSelectionStep: () => Promise<void>;
    isOnConfigurationStep: () => boolean;
    isOnFieldSelectionStep: () => boolean;
    isOnCreateStep: () => boolean;
  };
}

export const setup = async (
  httpSetup: HttpSetup,
  overridingDependencies: any = {}
): Promise<CreateEnrichPoliciesTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(EnrichPolicyCreate, httpSetup, overridingDependencies),
    testBedConfig
  );
  const testBed = await initTestBed();

  /**
   * User Actions
   */
  const isOnConfigurationStep = () => testBed.exists('configurationForm');
  const isOnFieldSelectionStep = () => testBed.exists('fieldSelectionForm');
  const isOnCreateStep = () => testBed.exists('creationStep');
  const clickNextButton = async () => {
    await act(async () => {
      testBed.find('nextButton').simulate('click');
    });

    testBed.component.update();
  };
  const clickBackButton = async () => {
    await act(async () => {
      testBed.find('backButton').simulate('click');
    });

    testBed.component.update();
  };
  const clickCreatePolicy = async (executeAfter?: boolean) => {
    await act(async () => {
      testBed.find(executeAfter ? 'createAndExecuteButton' : 'createButton').simulate('click');
    });

    testBed.component.update();
  };

  const clickRequestTab = async () => {
    await act(async () => {
      testBed.find('requestTab').simulate('click');
    });

    testBed.component.update();
  };

  const completeConfigurationStep = async ({ indices }: { indices?: string }) => {
    const { form } = testBed;

    form.setInputValue('policyNameField.input', 'test_policy');
    form.setSelectValue('policyTypeField', 'match');
    form.setSelectValue('policySourceIndicesField', indices ?? 'test-1');

    await clickNextButton();
  };

  const completeFieldsSelectionStep = async () => {
    const { form } = testBed;

    form.setSelectValue('matchField', 'name');
    form.setSelectValue('enrichFields', 'email');

    await clickNextButton();
  };

  return {
    ...testBed,
    actions: {
      clickNextButton,
      clickBackButton,
      clickRequestTab,
      clickCreatePolicy,
      completeConfigurationStep,
      completeFieldsSelectionStep,
      isOnConfigurationStep,
      isOnFieldSelectionStep,
      isOnCreateStep,
    },
  };
};
