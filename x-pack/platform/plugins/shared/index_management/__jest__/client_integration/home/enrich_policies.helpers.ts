/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import {
  registerTestBed,
  TestBed,
  AsyncTestBedConfig,
  findTestSubject,
} from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';
import { IndexManagementHome } from '../../../public/application/sections/home';
import { indexManagementStore } from '../../../public/application/store';
import { WithAppDependencies, services, TestSubjects } from '../helpers';

const testBedConfig: AsyncTestBedConfig = {
  store: () => indexManagementStore(services as any),
  memoryRouter: {
    initialEntries: [`/enrich_policies`],
    componentRoutePath: `/:section(enrich_policies)`,
  },
  doMountAsync: true,
};

export interface EnrichPoliciesTestBed extends TestBed<TestSubjects> {
  actions: {
    goToEnrichPoliciesTab: () => void;
    clickReloadPoliciesButton: () => void;
    clickDeletePolicyAt: (index: number) => Promise<void>;
    clickConfirmDeletePolicyButton: () => Promise<void>;
    clickExecutePolicyAt: (index: number) => Promise<void>;
    clickConfirmExecutePolicyButton: () => Promise<void>;
    clickEnrichPolicyAt: (index: number) => Promise<void>;
  };
}

export const setup = async (
  httpSetup: HttpSetup,
  overridingDependencies: any = {}
): Promise<EnrichPoliciesTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(IndexManagementHome, httpSetup, overridingDependencies),
    testBedConfig
  );
  const testBed = await initTestBed();

  /**
   * User Actions
   */
  const goToEnrichPoliciesTab = () => testBed.find('enrich_policiesTab').simulate('click');

  const clickReloadPoliciesButton = () => testBed.find('reloadPoliciesButton').simulate('click');

  const clickDeletePolicyAt = async (index: number) => {
    const { rows } = testBed.table.getMetaData('enrichPoliciesTable');

    const deletePolicyButton = findTestSubject(rows[index].reactWrapper, 'deletePolicyButton');

    await act(async () => {
      deletePolicyButton.simulate('click');
    });

    testBed.component.update();
  };

  const clickConfirmDeletePolicyButton = async () => {
    const modal = testBed.find('deletePolicyModal');
    const confirmButton = findTestSubject(modal, 'confirmModalConfirmButton');

    await act(async () => {
      confirmButton.simulate('click');
    });

    testBed.component.update();
  };

  const clickExecutePolicyAt = async (index: number) => {
    const { rows } = testBed.table.getMetaData('enrichPoliciesTable');

    const executePolicyButton = findTestSubject(rows[index].reactWrapper, 'executePolicyButton');

    await act(async () => {
      executePolicyButton.simulate('click');
    });

    testBed.component.update();
  };

  const clickConfirmExecutePolicyButton = async () => {
    const modal = testBed.find('executePolicyModal');
    const confirmButton = findTestSubject(modal, 'confirmModalConfirmButton');

    await act(async () => {
      confirmButton.simulate('click');
    });

    testBed.component.update();
  };

  const clickEnrichPolicyAt = async (index: number) => {
    const { component, table, router } = testBed;

    const { rows } = table.getMetaData('enrichPoliciesTable');

    const policyLink = findTestSubject(rows[index].reactWrapper, 'enrichPolicyDetailsLink');

    await act(async () => {
      const { href } = policyLink.props();
      router.navigateTo(href!);
    });

    component.update();
  };

  return {
    ...testBed,
    actions: {
      goToEnrichPoliciesTab,
      clickReloadPoliciesButton,
      clickDeletePolicyAt,
      clickConfirmDeletePolicyButton,
      clickExecutePolicyAt,
      clickConfirmExecutePolicyButton,
      clickEnrichPolicyAt,
    },
  };
};
