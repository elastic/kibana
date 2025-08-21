/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { registerTestBed } from '@kbn/test-jest-helpers';
import type { HttpSetup } from '@kbn/core/public';
import { PolicyAdd } from '../../../public/application/sections/policy_add';
import type { PolicyFormTestSubjects } from './policy_form.helpers';
import { formSetup } from './policy_form.helpers';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: ['/add_policy'],
    componentRoutePath: '/add_policy',
  },
  doMountAsync: true,
};

export const setup = async (httpSetup: HttpSetup) => {
  const initTestBed = registerTestBed<PolicyFormTestSubjects>(
    WithAppDependencies(PolicyAdd, httpSetup),
    testBedConfig
  );

  return formSetup(initTestBed);
};
