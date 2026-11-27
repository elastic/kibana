/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DreamingTemplate, LoadedDreamingTemplate } from '../../common/dreaming_templates';
import customerInsights from './templates/customer_insights.json';
import customerSupport from './templates/customer_support.json';
import developerDocumentation from './templates/developer_documentation.json';
import financeAssistant from './templates/finance_assistant.json';
import healthcareAssistant from './templates/healthcare_assistant.json';
import index from './templates/index.json';
import legalAssistant from './templates/legal_assistant.json';
import personalAssistant from './templates/personal_assistant.json';
import technicalSupport from './templates/technical_support.json';

export const DREAMING_TEMPLATES_BY_ID = {
  personal_assistant: personalAssistant,
  customer_support: customerSupport,
  customer_insights: customerInsights,
  technical_support: technicalSupport,
  legal_assistant: legalAssistant,
  finance_assistant: financeAssistant,
  healthcare_assistant: healthcareAssistant,
  developer_documentation: developerDocumentation,
} satisfies Record<string, DreamingTemplate>;

type DreamingTemplateId = keyof typeof DREAMING_TEMPLATES_BY_ID;

const isDreamingTemplateId = (id: string): id is DreamingTemplateId =>
  Object.prototype.hasOwnProperty.call(DREAMING_TEMPLATES_BY_ID, id);

/** Built-in example dreaming configs in display order. */
export const DREAMING_TEMPLATES: LoadedDreamingTemplate[] = index.templates.map((summary) => {
  if (!isDreamingTemplateId(summary.id)) {
    throw new Error(`Unknown dreaming template '${summary.id}'`);
  }
  return {
    ...summary,
    ...DREAMING_TEMPLATES_BY_ID[summary.id],
  };
});
