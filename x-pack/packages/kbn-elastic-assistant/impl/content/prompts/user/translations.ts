/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EXPLAIN_THE_MEANING_FROM_CONTEXT_ABOVE = i18n.translate(
  'xpack.elasticAssistant.assistant.content.prompts.user.explainTheMeaningFromContextAbove',
  {
    defaultMessage: 'Explain the meaning from the context above',
  }
);

export const THEN_SUMMARIZE_SUGGESTED_KQL_AND_EQL_QUERIES = i18n.translate(
  'xpack.elasticAssistant.assistant.content.prompts.user.thenSummarizeSuggestedKqlAndEqlQueries',
  {
    defaultMessage: 'then summarize a list of suggested Elasticsearch KQL and EQL queries',
  }
);

export const FINALLY_SUGGEST_INVESTIGATION_GUIDE_AND_FORMAT_AS_MARKDOWN = i18n.translate(
  'xpack.elasticAssistant.assistant.content.prompts.user.finallySuggestInvestigationGuideAndFormatAsMarkdown',
  {
    defaultMessage: 'Finally, suggest an investigation guide, and format it as markdown',
  }
);

export const EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N = `${EXPLAIN_THE_MEANING_FROM_CONTEXT_ABOVE}, ${THEN_SUMMARIZE_SUGGESTED_KQL_AND_EQL_QUERIES}.
${FINALLY_SUGGEST_INVESTIGATION_GUIDE_AND_FORMAT_AS_MARKDOWN}.`;
