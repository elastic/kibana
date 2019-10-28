/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBedConfig } from '../../../../../../test_utils';
import { PolicyEdit } from '../../../public/app/sections/policy_edit';
import { WithProviders } from './providers';
import { POLICY_NAME } from './constant';
import { formSetup, PolicyFormTestSubjects } from './policy_form.helpers';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`/edit_policy/${POLICY_NAME}`],
    componentRoutePath: '/edit_policy/:name',
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed<PolicyFormTestSubjects>(
  WithProviders(PolicyEdit),
  testBedConfig
);

export const setup = formSetup.bind(null, initTestBed);
