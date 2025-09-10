/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { registerTestBed } from '@kbn/test-jest-helpers';
import type { HttpSetup } from '@kbn/core/public';
import { TemplateEdit } from '../../../public/application/sections/template_edit';
import { WithAppDependencies } from '../helpers';

import type { TestSubjects } from './template_form.helpers';
import { formSetup } from './template_form.helpers';
import { TEMPLATE_NAME } from './constants';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`/edit_template/${TEMPLATE_NAME}`],
    componentRoutePath: `/edit_template/:name`,
  },
  doMountAsync: true,
};

export const setup = async (httpSetup: HttpSetup) => {
  const initTestBed = registerTestBed<TestSubjects>(
    WithAppDependencies(TemplateEdit, httpSetup),
    testBedConfig
  );

  return formSetup(initTestBed);
};
