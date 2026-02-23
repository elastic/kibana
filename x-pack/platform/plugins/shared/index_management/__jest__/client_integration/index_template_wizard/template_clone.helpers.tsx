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

import { getComposableTemplate } from '../../../test/fixtures';
import { TEMPLATE_NAME, INDEX_PATTERNS as DEFAULT_INDEX_PATTERNS } from './constants';
import { TemplateClone } from '../../../public/application/sections/template_clone';
import { WithAppDependencies } from '../helpers/setup_environment';
import { wizardSteps } from '../helpers/actions/wizard_steps';

export const templateToClone = getComposableTemplate({
  name: TEMPLATE_NAME,
  indexPatterns: ['indexPattern1'],
  template: {},
  allowAutoCreate: 'TRUE',
});

/**
 * Helper to render template clone component with routing.
 */
export const renderTemplateClone = (httpSetup: HttpSetup) => {
  const CloneWithRouter = () => (
    <MemoryRouter initialEntries={[`/clone_template/${TEMPLATE_NAME}`]}>
      <Route path="/clone_template/:name" component={TemplateClone} />
    </MemoryRouter>
  );

  return render(React.createElement(WithAppDependencies(CloneWithRouter, httpSetup)));
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

export const DEFAULT_INDEX_PATTERNS_FOR_CLONE = DEFAULT_INDEX_PATTERNS;
