/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERTS_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.alertsLabel',
  {
    defaultMessage: 'Alerts',
  }
);

export const SEND_ALERTS_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.sendAlertsLabel',
  {
    defaultMessage: 'Send Alerts',
  }
);

export const LATEST_AND_RISKIEST_OPEN_ALERTS = (alertsCount: number) =>
  i18n.translate(
    'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.latestAndRiskiestOpenAlertsLabel',
    {
      defaultMessage:
        'Send AI Assistant information about your {alertsCount} newest and riskiest open or acknowledged alerts.',
      values: { alertsCount },
    }
  );

export const YOUR_ANONYMIZATION_SETTINGS = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.yourAnonymizationSettingsLabel',
  {
    defaultMessage: 'Your anonymization settings will apply to these alerts.',
  }
);

export const SELECT_FEWER_ALERTS = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.selectFewerAlertsLabel',
  {
    defaultMessage: "Send fewer alerts if the model's context window is too small.",
  }
);

export const ALERTS_RANGE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.alertsRangeSliderLabel',
  {
    defaultMessage: 'Alerts range',
  }
);

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

export const KNOWLEDGE_BASE_DOCUMENTATION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.settingsDescription',
  {
    defaultMessage: 'documentation',
  }
);

export const KNOWLEDGE_BASE_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.knowledgeBaseLabel',
  {
    defaultMessage: 'Knowledge Base',
  }
);

export const SETUP_KNOWLEDGE_BASE_BUTTON = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.setupKnowledgeBaseButton',
  {
    defaultMessage: 'Setup',
  }
);

export const SETUP_KNOWLEDGE_BASE_BUTTON_TOOLTIP = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.setupKnowledgeBaseButtonToolTip',
  {
    defaultMessage: 'Knowledge Base unavailable, please see documentation for more details.',
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

export const KNOWLEDGE_BASE_ELSER_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.knowledgeBaseSettings.elserLabel',
  {
    defaultMessage: 'ELSER Configured',
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
