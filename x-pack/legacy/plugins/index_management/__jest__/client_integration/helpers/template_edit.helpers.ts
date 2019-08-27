/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBedConfig } from '../../../../../../test_utils';
import { BASE_PATH } from '../../../common/constants';
import { TemplateEdit } from '../../../public/sections/template_edit';
import { formSetup } from './template_form.helpers';
import { TEMPLATE_NAME } from './constants';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`${BASE_PATH}edit_template/${TEMPLATE_NAME}`],
    componentRoutePath: `${BASE_PATH}edit_template/:name`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(TemplateEdit, testBedConfig);

export const setup = formSetup.bind(null, initTestBed);
