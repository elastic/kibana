/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// START SUMMARY
export const AI_SUMMARY = i18n.translate('xpack.elasticAssistant.alertSummary.aiSummaryTitle', {
  defaultMessage: 'AI summary',
});

export const NO_SUMMARY_AVAILABLE = i18n.translate(
  'xpack.elasticAssistant.alertSummary.noSummaryAvailable',
  {
    defaultMessage: 'No summary available',
  }
);

export const GENERATING = i18n.translate('xpack.elasticAssistant.alertSummary.generating', {
  defaultMessage: 'Generating AI description and recommended actions.',
});

export const GENERATE = i18n.translate('xpack.elasticAssistant.alertSummary.generate', {
  defaultMessage: 'Generate insights',
});
// END SUMMARY

// START SUGGESTED PROMPTS

export const SUGGESTED_PROMPTS = i18n.translate(
  'xpack.elasticAssistant.alertSummary.suggestedPrompts',
  {
    defaultMessage: 'Suggested prompts',
  }
);

export const ALERT_FROM_FLYOUT = i18n.translate(
  'xpack.elasticAssistant.alertSummary.alertFromFlyout',
  {
    defaultMessage: 'Alert (from flyout)',
  }
);

export const PROMPT_1_TITLE = i18n.translate('xpack.elasticAssistant.alertSummary.prompt1Title', {
  defaultMessage: 'Investigation guide',
});

export const PROMPT_1_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.alertSummary.prompt1Description',
  {
    defaultMessage: 'Guide me through investigating a suspicious activity alert.',
  }
);

export const PROMPT_1_PROMPT = i18n.translate('xpack.elasticAssistant.alertSummary.prompt1Prompt', {
  defaultMessage:
    'Walk me through the steps to investigate the above suspicious activity alert, including key indicators to review and recommended actions.',
});

export const PROMPT_2_TITLE = i18n.translate('xpack.elasticAssistant.alertSummary.prompt2Title', {
  defaultMessage: 'Best practices for noisy alerts',
});

export const PROMPT_2_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.alertSummary.prompt2Description',
  {
    defaultMessage: 'Learn how to set and manage noisy alerts effectively.',
  }
);

export const PROMPT_2_PROMPT = i18n.translate('xpack.elasticAssistant.alertSummary.prompt2Prompt', {
  defaultMessage: 'What are the best practices for setting and managing noisy alerts?',
});

export const PROMPT_3_TITLE = i18n.translate('xpack.elasticAssistant.alertSummary.prompt3Title', {
  defaultMessage: 'Optimize cloud security settings',
});

export const PROMPT_3_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.alertSummary.prompt3Description',
  {
    defaultMessage: 'Discover ways to enhance your cloud security configurations.',
  }
);

export const PROMPT_3_PROMPT = i18n.translate('xpack.elasticAssistant.alertSummary.prompt3Prompt', {
  defaultMessage: 'How can I optimize my cloud security settings?',
});

export const SUGGESTED_PROMPTS_CONTEXT_TOOLTIP = i18n.translate(
  'xpack.elasticAssistant.alertSummary.suggestedPromptsContextTooltip',
  {
    defaultMessage: 'Add this alert as context.',
  }
);

// END SUGGESTED PROMPTS

// START AI ASSISTANT
export const AI_ASSISTANT = i18n.translate('xpack.elasticAssistant.aiAssistant.title', {
  defaultMessage: 'AI Assistant',
});

export const YOUR_CONVERSATIONS = i18n.translate(
  'xpack.elasticAssistant.aiAssistant.yourConversations',
  {
    defaultMessage: 'Your conversations',
  }
);

export const VIEW = i18n.translate('xpack.elasticAssistant.aiAssistant.view', {
  defaultMessage: 'View',
});

// END AI ASSISTANT
