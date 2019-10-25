/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBedConfig } from '../../../../../../test_utils';
import { BASE_PATH } from '../../../common/constants';
import { TemplateCreate } from '../../../public/app/sections/template_create';
import { formSetup, TestSubjects } from './template_form.helpers';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`${BASE_PATH}create_template`],
    componentRoutePath: `${BASE_PATH}create_template`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed<TestSubjects>(TemplateCreate, testBedConfig);

export const setup = formSetup.bind(null, initTestBed);
