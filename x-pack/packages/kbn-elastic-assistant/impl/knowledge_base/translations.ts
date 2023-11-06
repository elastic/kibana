/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SETTINGS_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.settingsTitle',
  {
    defaultMessage: 'Knowledge Base',
  }
);

export const SETTINGS_BADGE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.settingsBadgeTitle',
  {
    defaultMessage: 'Experimental',
  }
);

export const SETTINGS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.settingsDescription',
  {
    defaultMessage:
      'Powered by ELSER, the Knowledge Base enables the ability to recall documents and other relevant context within your conversation.',
  }
);

export const KNOWLEDGE_BASE_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.knowledgeBaseLabel',
  {
    defaultMessage: 'Knowledge Base',
  }
);

export const KNOWLEDGE_BASE_TOOLTIP = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.knowledgeBaseTooltip',
  {
    defaultMessage: 'ELSER must be configured to enable the Knowledge Base',
  }
);

export const KNOWLEDGE_BASE_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.knowledgeBaseDescription',
  {
    defaultMessage: 'Index where Knowledge Base docs are stored',
  }
);

export const KNOWLEDGE_BASE_DESCRIPTION_INSTALLED = (kbIndexPattern: string) =>
  i18n.translate(
    'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.knowledgeBaseInstalledDescription',
    {
      defaultMessage: 'Initialized to `{kbIndexPattern}`',
      values: { kbIndexPattern },
    }
  );

export const KNOWLEDGE_BASE_INIT_BUTTON = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.initializeKnowledgeBaseButton',
  {
    defaultMessage: 'Initialize',
  }
);

export const KNOWLEDGE_BASE_DELETE_BUTTON = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.deleteKnowledgeBaseButton',
  {
    defaultMessage: 'Delete',
  }
);

export const KNOWLEDGE_BASE_ELSER_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.elserLabel',
  {
    defaultMessage: 'ELSER Configured',
  }
);

export const KNOWLEDGE_BASE_ELSER_MACHINE_LEARNING = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.elserMachineLearningDescription',
  {
    defaultMessage: 'Machine Learning',
  }
);

export const KNOWLEDGE_BASE_ELSER_SEE_DOCS = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.elserSeeDocsDescription',
  {
    defaultMessage: 'See docs',
  }
);

export const ESQL_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.esqlLabel',
  {
    defaultMessage: 'ES|QL Knowledge Base Documents',
  }
);

export const ESQL_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.esqlDescription',
  {
    defaultMessage: 'Knowledge Base docs for generating ES|QL queries',
  }
);

export const ESQL_DESCRIPTION_INSTALLED = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.esqlInstalledDescription',
  {
    defaultMessage: 'ES|QL Knowledge Base docs loaded',
  }
);
