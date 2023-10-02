/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SETTINGS_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.advancedSettings.settingsTitle',
  {
    defaultMessage: 'Advanced Settings',
  }
);
export const SETTINGS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.advancedSettings.settingsDescription',
  {
    defaultMessage: 'Additional knobs and dials for the Elastic AI Assistant.',
  }
);

export const LANNGCHAIN_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.advancedSettings.langChainLabel',
  {
    defaultMessage: 'Experimental LangChain Integration',
  }
);

export const LANNGCHAIN_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.advancedSettings.langChainDescription',
  {
    defaultMessage:
      'Enables advanced features and workflows like the Knowledge Base, Functions, Memories, and advanced agent and chain configurations. ',
  }
);

export const KNOWLEDGE_BASE_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.advancedSettings.knowledgeBaseLabel',
  {
    defaultMessage: 'Knowledge Base',
  }
);

export const KNOWLEDGE_BASE_LABEL_TOOLTIP = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.advancedSettings.knowledgeBaseLabelTooltip',
  {
    defaultMessage: 'Requires ELSER to be configured and started.',
  }
);

export const KNOWLEDGE_BASE_DESCRIPTION_ELSER_LEARN_MORE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.advancedSettings.knowledgeBaseElserLearnMoreDescription',
  {
    defaultMessage: 'Learn more.',
  }
);

export const ESQL_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.advancedSettings.esqlLabel',
  {
    defaultMessage: 'ES|QL Knowledge Base Documents',
  }
);

export const ESQL_LABEL_TOOLTIP = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.advancedSettings.esqlTooltip',
  {
    defaultMessage: 'Requires `Knowledge Base` to be enabled.',
  }
);

export const ESQL_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.advancedSettings.esqlDescription',
  {
    defaultMessage:
      'Loads ES|QL documentation and language files into the Knowledge Base for use in generating ES|QL queries.',
  }
);
