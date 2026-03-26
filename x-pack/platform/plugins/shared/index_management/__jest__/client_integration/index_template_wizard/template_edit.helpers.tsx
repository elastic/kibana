/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import type { HttpSetup } from '@kbn/core/public';

import { TEMPLATE_NAME, MAPPINGS as DEFAULT_MAPPING } from './constants';
import { TemplateEdit } from '../../../public/application/sections/template_edit';
import { WithAppDependencies } from '../helpers/setup_environment';
import { wizardSteps } from '../helpers/actions/wizard_steps';

export const UPDATED_INDEX_PATTERN = ['updatedIndexPattern'];
export const UPDATED_MAPPING_TEXT_FIELD_NAME = 'updated_text_datatype';
export const MAPPING = {
  ...DEFAULT_MAPPING,
  properties: {
    text_datatype: {
      type: 'text',
    },
  },
};

export const NONEXISTENT_COMPONENT_TEMPLATE = {
  name: 'component_template@custom',
  hasMappings: false,
  hasAliases: false,
  hasSettings: false,
  usedBy: [],
};

export const EXISTING_COMPONENT_TEMPLATE = {
  name: 'test_component_template',
  hasMappings: true,
  hasAliases: false,
  hasSettings: false,
  usedBy: [],
  isManaged: false,
};

/**
 * Helper to render TemplateEdit component with routing.
 */
export const renderTemplateEdit = (httpSetup: HttpSetup, templateName: string = TEMPLATE_NAME) => {
  const EditWithRouter = () => (
    <MemoryRouter initialEntries={[`/edit_template/${templateName}`]}>
      <Route path="/edit_template/:name" component={TemplateEdit} />
    </MemoryRouter>
  );

  return render(React.createElement(WithAppDependencies(EditWithRouter, httpSetup)));
};

/**
 * Helper to fill form step-by-step.
 */
export const completeStep = {
  one: wizardSteps.completeStepOne,
  two: wizardSteps.completeStepTwo,
  three: wizardSteps.completeStepThree,
  four: wizardSteps.completeStepFour,
  five: wizardSteps.completeStepFive,
};
