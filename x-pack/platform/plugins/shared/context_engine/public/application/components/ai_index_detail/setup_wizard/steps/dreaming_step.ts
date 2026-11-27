/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isDreamingSetUp } from '../../../dreaming_config/dreaming_config_editor';
import type { SetupWizardStep } from '../types';
import { PlaceholderStepContent } from './placeholder_step_content';

export const dreamingStep: SetupWizardStep = {
  id: 'dreaming',
  texts: {
    stepTitle: i18n.translate('xpack.contextEngine.setupWizard.dreaming.stepTitle', {
      defaultMessage: 'Shape dreaming',
    }),
    title: i18n.translate('xpack.contextEngine.setupWizard.dreaming.title', {
      defaultMessage: 'Shape what dreaming learns',
    }),
    description: i18n.translate('xpack.contextEngine.setupWizard.dreaming.description', {
      defaultMessage:
        'Dreaming reads what your agent saves and turns it into facts. Pick the template closest to your agent. You can change it later in Settings.',
    }),
    docsLinkLabel: i18n.translate('xpack.contextEngine.setupWizard.dreaming.docsLink', {
      defaultMessage: 'How dreaming works',
    }),
  },
  getDocsLink: ({ memory }) => memory,
  // Without memory there is no dreaming.
  isAvailable: ({ isMemoryEnabled }) => isMemoryEnabled,
  isDone: ({ dreaming }) => dreaming !== undefined && isDreamingSetUp(dreaming),
  Content: PlaceholderStepContent,
};
