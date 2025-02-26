/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { registerTestBed } from '@kbn/test-jest-helpers';
import type { HttpSetup } from '@kbn/core/public';
import { PolicyEdit } from '../../../public/application/sections/policy_edit';
import { WithAppDependencies } from './setup_environment';
import { POLICY_NAME } from './constant';
import type { PolicyFormTestSubjects } from './policy_form.helpers';
import { formSetup } from './policy_form.helpers';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`/edit_policy/${POLICY_NAME}`],
    componentRoutePath: '/edit_policy/:name',
  },
  doMountAsync: true,
};

export const setup = async (httpSetup: HttpSetup) => {
  const initTestBed = registerTestBed<PolicyFormTestSubjects>(
    WithAppDependencies(PolicyEdit, httpSetup),
    testBedConfig
  );

  return formSetup(initTestBed);
};
