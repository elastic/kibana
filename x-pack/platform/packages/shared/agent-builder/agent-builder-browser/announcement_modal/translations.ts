/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MODAL_TITLE = i18n.translate(
  'agentBuilderBrowser.agentBuilderAnnouncement.modalTitle',
  { defaultMessage: 'Introducing AI Agent' }
);

export const BETA_LABEL = i18n.translate('agentBuilderBrowser.agentBuilderAnnouncement.betaLabel', {
  defaultMessage: 'Beta',
});

export const WHAT_TO_EXPECT = i18n.translate(
  'agentBuilderBrowser.agentBuilderAnnouncement.whatToExpect',
  { defaultMessage: 'What to expect:' }
);

export const DUAL_EXPERIENCES_TITLE = i18n.translate(
  'agentBuilderBrowser.agentBuilderAnnouncement.dualExperiencesTitle',
  { defaultMessage: 'Dual Experiences:' }
);

export const DUAL_EXPERIENCES_BODY = i18n.translate(
  'agentBuilderBrowser.agentBuilderAnnouncement.dualExperiencesBody',
  {
    defaultMessage:
      'Both AI Agent and AI Assistant are available. You are currently using the AI Agent.',
  }
);

export const DATA_ISOLATION_TITLE = i18n.translate(
  'agentBuilderBrowser.agentBuilderAnnouncement.dataIsolationTitle',
  { defaultMessage: 'Data Isolation:' }
);

export const DATA_ISOLATION_BODY = i18n.translate(
  'agentBuilderBrowser.agentBuilderAnnouncement.dataIsolationBody',
  {
    defaultMessage:
      'AI Agent starts with a clean slate and does not currently access your previous chats, prompts, or knowledge base entries from AI Assistant.',
  }
);

export const FEATURE_PARITY_TITLE = i18n.translate(
  'agentBuilderBrowser.agentBuilderAnnouncement.featureParityTitle',
  { defaultMessage: 'Feature Parity:' }
);

export const FEATURE_PARITY_BODY = i18n.translate(
  'agentBuilderBrowser.agentBuilderAnnouncement.featureParityBody',
  {
    defaultMessage:
      'Some legacy features, such as anonymization and chat sharing, are not yet supported in this Beta version.',
  }
);

export const NEED_HISTORY_TITLE = i18n.translate(
  'agentBuilderBrowser.agentBuilderAnnouncement.needHistoryTitle',
  { defaultMessage: 'Need your history?' }
);

export const NEED_HISTORY_BODY = i18n.translate(
  'agentBuilderBrowser.agentBuilderAnnouncement.needHistoryBody',
  {
    defaultMessage:
      'Your AI Assistant data is safe and remains fully accessible. You can opt-out of the Agent and switch back to the legacy Assistant at any time via the GenAI Settings page.',
  }
);

export const REVERT_BUTTON = i18n.translate(
  'agentBuilderBrowser.agentBuilderAnnouncement.revertButton',
  { defaultMessage: 'Revert to AI Assistant' }
);

export const CONTINUE_BUTTON = i18n.translate(
  'agentBuilderBrowser.agentBuilderAnnouncement.continueButton',
  { defaultMessage: 'Continue with AI Agent' }
);
