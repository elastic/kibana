/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFeedbackQuestionsForApp } from './registry';

describe('getFeedbackQuestionsForApp', () => {
  it.each([
    'management:cases',
    'securitySolutionUI:cases',
    'securitySolutionUI:cases_create',
    'securitySolutionUI:cases_configure',
    'securitySolutionUI:cases_templates',
    'observability-overview:cases',
    'observability-overview:cases_create',
    'observability-overview:cases_configure',
    'observability-overview:cases_templates',
  ])('returns the Cases feedback questions for %s', async (appId) => {
    await expect(getFeedbackQuestionsForApp(appId)).resolves.toEqual([
      expect.objectContaining({
        id: 'cases_experience',
        order: 1,
        question: 'Describe your experience',
      }),
      expect.objectContaining({
        id: 'cases_task_context',
        order: 2,
        question: 'What were you trying to do today?',
      }),
    ]);
  });

  it('returns the default feedback questions for unknown apps', async () => {
    await expect(getFeedbackQuestionsForApp('unknown-app')).resolves.toEqual([
      expect.objectContaining({
        id: 'default_experience',
        order: 1,
        question: 'Describe your experience',
      }),
      expect.objectContaining({
        id: 'general_feedback',
        order: 2,
        question: 'Anything else you would like to share about Elastic overall?',
      }),
    ]);
  });
});
