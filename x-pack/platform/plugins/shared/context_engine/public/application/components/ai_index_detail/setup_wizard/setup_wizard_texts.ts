/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SetupWizardStepId } from '../../../utils/setup_wizard';

interface SetupWizardStepTexts {
  /** Short name in the steps bar. */
  stepTitle: string;
  /** Heading of the step's panel. */
  title: string;
  description: string;
  docsLinkLabel: string;
}

export const SETUP_WIZARD_STEP_TEXTS: Readonly<Record<SetupWizardStepId, SetupWizardStepTexts>> = {
  dreaming: {
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
  connect: {
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
  sources: {
    stepTitle: i18n.translate('xpack.contextEngine.setupWizard.sources.stepTitle', {
      defaultMessage: 'Add sources',
    }),
    title: i18n.translate('xpack.contextEngine.setupWizard.sources.title', {
      defaultMessage: 'Add sources',
    }),
    description: i18n.translate('xpack.contextEngine.setupWizard.sources.description', {
      defaultMessage:
        "Context reads an index or a connected app and writes knowledge documents from it. Your agent's memories are enough to start, so you can skip this and add sources later.",
    }),
    docsLinkLabel: i18n.translate('xpack.contextEngine.setupWizard.sources.docsLink', {
      defaultMessage: 'Sources and automations',
    }),
  },
  describe: {
    stepTitle: i18n.translate('xpack.contextEngine.setupWizard.describe.stepTitle', {
      defaultMessage: 'Describe index',
    }),
    title: i18n.translate('xpack.contextEngine.setupWizard.describe.title', {
      defaultMessage: 'Describe this index',
    }),
    description: i18n.translate('xpack.contextEngine.setupWizard.describe.description', {
      defaultMessage: 'Agents read the description to decide when to use this index.',
    }),
    docsLinkLabel: i18n.translate('xpack.contextEngine.setupWizard.describe.docsLink', {
      defaultMessage: 'Describe an AI index',
    }),
  },
};
