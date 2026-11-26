/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SetupWizardStep } from '../types';
import { PlaceholderStepContent } from './placeholder_step_content';

export const connectStep: SetupWizardStep = {
  id: 'connect',
  texts: {
    stepTitle: i18n.translate('xpack.contextEngine.setupWizard.connect.stepTitle', {
      defaultMessage: 'Connect agent',
    }),
    title: i18n.translate('xpack.contextEngine.setupWizard.connect.title', {
      defaultMessage: 'Connect your agent',
    }),
    description: i18n.translate('xpack.contextEngine.setupWizard.connect.description', {
      defaultMessage:
        'Your agent saves what it learns to this index and looks up what the index knows. Connect a coding agent such as Claude Code, Cursor or Codex.',
    }),
    docsLinkLabel: i18n.translate('xpack.contextEngine.setupWizard.connect.docsLink', {
      defaultMessage: 'Connect an agent',
    }),
  },
  getDocsLink: ({ overview }) => overview,
  // The first memory an agent saves shows it is connected. Without memory it can never be done.
  isDone: ({ memoryCount }) => memoryCount > 0,
  isOptional: true,
  Content: PlaceholderStepContent,
};
