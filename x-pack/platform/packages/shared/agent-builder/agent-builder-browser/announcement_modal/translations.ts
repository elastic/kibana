/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type AgentBuilderAnnouncementVariant = '1a' | '1b' | '2a';

export const MODAL_TITLE = i18n.translate('xpack.agentBuilder.announcementModal.modalTitle', {
  defaultMessage: 'Introducing AI Agent',
});

export const INTRO = i18n.translate('xpack.agentBuilder.announcementModal.intro', {
  defaultMessage:
    'AI Agent can take action, not just answer. It runs queries, connects your tools, and works across your environment to complete tasks end-to-end.',
});

export const FEATURE_TAKES_ACTION_TITLE = i18n.translate(
  'xpack.agentBuilder.announcementModal.featureTakesActionTitle',
  { defaultMessage: 'Takes action' }
);

export const FEATURE_TAKES_ACTION_BODY = i18n.translate(
  'xpack.agentBuilder.announcementModal.featureTakesActionBody',
  {
    defaultMessage: 'by executing multi-step tasks, not just suggestions',
  }
);

export const FEATURE_CONNECTS_TOOLS_TITLE = i18n.translate(
  'xpack.agentBuilder.announcementModal.featureConnectsToolsTitle',
  { defaultMessage: 'Connects tools' }
);

export const FEATURE_CONNECTS_TOOLS_BODY = i18n.translate(
  'xpack.agentBuilder.announcementModal.featureConnectsToolsBody',
  {
    defaultMessage: 'by working across data sources and integrations',
  }
);

export const FEATURE_ITERATES_TITLE = i18n.translate(
  'xpack.agentBuilder.announcementModal.featureIteratesTitle',
  { defaultMessage: 'Iterates' }
);

export const FEATURE_ITERATES_BODY = i18n.translate(
  'xpack.agentBuilder.announcementModal.featureIteratesBody',
  {
    defaultMessage: 'by adapting mid-task based on what it finds',
  }
);

export const IMPORTANT_NOTES_TITLE = i18n.translate(
  'xpack.agentBuilder.announcementModal.importantNotesTitle',
  { defaultMessage: 'Important notes:' }
);

export const NOTE_REPLACES_LEGACY_AGENTS = i18n.translate(
  'xpack.agentBuilder.announcementModal.noteReplacesLegacyAgents',
  {
    defaultMessage: 'Elastic Al Agent replaces Threat Hunting Agent and Observability Agent',
  }
);

export const NOTE_REPLACES_LEGACY_AGENTS_LEARN_MORE = i18n.translate(
  'xpack.agentBuilder.announcementModal.noteReplacesLegacyAgentsLearnMore',
  { defaultMessage: 'Learn more' }
);

export const NOTE_HISTORY_UNTOUCHED = i18n.translate(
  'xpack.agentBuilder.announcementModal.noteHistoryUntouched',
  {
    defaultMessage: 'AI Assistant chat history, prompts, and data are untouched',
  }
);

export const NOTE_REVERT_IN_SETTINGS = i18n.translate(
  'xpack.agentBuilder.announcementModal.noteRevertInSettings',
  {
    defaultMessage: 'Revert all users in this space to AI Assistant anytime in GenAI Settings',
  }
);

export const NOTE_CONTACT_ADMIN = i18n.translate(
  'xpack.agentBuilder.announcementModal.noteContactAdmin',
  {
    defaultMessage: 'To revert to AI Assistant, please contact your administrator',
  }
);

export const REVERT_BUTTON = i18n.translate('xpack.agentBuilder.announcementModal.revertButton', {
  defaultMessage: 'Revert to AI Assistant',
});

export const RELEASE_NOTES_BUTTON = i18n.translate(
  'xpack.agentBuilder.announcementModal.releaseNotesButton',
  { defaultMessage: 'Release notes' }
);

export const USE_AI_AGENT_BUTTON = i18n.translate(
  'xpack.agentBuilder.announcementModal.useAiAgentButton',
  { defaultMessage: 'Use AI Agent' }
);
