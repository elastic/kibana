/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOAD_ACTIONS_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.securityAssistant.connectors.useLoadActionTypes.errorMessage',
  {
    defaultMessage:
      'Welcome to your Elastic Assistant! I am your 100% open-source portal into your Elastic Life. ',
  }
);

export const LOAD_CONNECTORS_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.securityAssistant.connectors.useLoadConnectors.errorMessage',
  {
    defaultMessage:
      'Welcome to your Elastic Assistant! I am your 100% open-source portal into your Elastic Life. ',
  }
);

export const WELCOME_SECURITY = i18n.translate(
  'xpack.securitySolution.securityAssistant.content.prompts.welcome.welcomeSecurityPrompt',
  {
    defaultMessage:
      'Welcome to your Elastic Assistant! I am your 100% open-source portal into Elastic Security. ',
  }
);

export const THEN_SUMMARIZE_SUGGESTED_KQL_AND_EQL_QUERIES = i18n.translate(
  'xpack.securitySolution.securityAssistant.content.prompts.user.thenSummarizeSuggestedKqlAndEqlQueries',
  {
    defaultMessage: 'then summarize a list of suggested Elasticsearch KQL and EQL queries',
  }
);

export const FINALLY_SUGGEST_INVESTIGATION_GUIDE_AND_FORMAT_AS_MARKDOWN = i18n.translate(
  'xpack.securitySolution.securityAssistant.content.prompts.user.finallySuggestInvestigationGuideAndFormatAsMarkdown',
  {
    defaultMessage: 'Finally, suggest an investigation guide, and format it as markdown',
  }
);

export const UPDATE_PREPACKAGED_RULES_AND_TIMELINES_MSG = (
  updateRules: number,
  updateTimelines: number
) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.updatePrePackagedRulesAndTimelinesMsg',
    {
      values: { updateRules, updateTimelines },
      defaultMessage:
        'You can update {updateRules} Elastic prebuilt {updateRules, plural, =1 {rule} other {rules}} and {updateTimelines} Elastic prebuilt {updateTimelines, plural, =1 {timeline} other {timelines}}. Note that this will reload deleted Elastic prebuilt rules.',
    }
  );

export const CONNECTOR_SELECTOR_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.connectorSelector.labelTitle',
  {
    defaultMessage: 'Connector',
  }
);
export const CONNECTOR_SELECTOR_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.connectorSelector.ariaLabel',
  {
    defaultMessage: 'Conversation Selector',
  }
);

export const ADD_NEW_CONNECTOR = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.connectorSelector.newConnectorOptions',
  {
    defaultMessage: 'Add New Connector',
  }
);

export const ADD_CONNECTOR_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.addConnectorButton.title',
  {
    defaultMessage: 'Add Generative AI Connector',
  }
);

export const ADD_CONNECTOR_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.addConnectorButton.description',
  {
    defaultMessage: 'Configure a connector to continue the conversation',
  }
);

export const CONNECTOR_ADDED_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.addConnectorButton.title',
  {
    defaultMessage: 'Generative AI Connector added!',
  }
);

export const CONNECTOR_ADDED_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.addConnectorButton.description',
  {
    defaultMessage: 'Ready to continue the conversation...',
  }
);

export const CONNECTOR_SETUP_USER_YOU = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.setup.userYouTitle',
  {
    defaultMessage: 'You',
  }
);

export const CONNECTOR_SETUP_USER_ASSISTANT = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.setup.userAssistantTitle',
  {
    defaultMessage: 'Assistant',
  }
);

export const CONNECTOR_SETUP_TIMESTAMP_AT = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.setup.timestampAtTitle',
  {
    defaultMessage: 'at',
  }
);

export const CONNECTOR_SETUP_SKIP = i18n.translate(
  'xpack.elasticAssistant.assistant.connectors.setup.skipTitle',
  {
    defaultMessage: "[ Press 'space' to skip... ]",
  }
);
