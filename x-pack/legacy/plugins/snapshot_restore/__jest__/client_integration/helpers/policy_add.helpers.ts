/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBedConfig } from '../../../../../../test_utils';
import { PolicyAdd } from '../../../public/app/sections/policy_add';
import { WithProviders } from './providers';
import { formSetup, PolicyFormTestSubjects } from './policy_form.helpers';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: ['/add_policy'],
    componentRoutePath: '/add_policy',
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed<PolicyFormTestSubjects>(
  WithProviders(PolicyAdd),
  testBedConfig
);

export const setup = formSetup.bind(null, initTestBed);
