/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexDreamingConfig } from './dreaming';

export const MAX_DREAMING_TEMPLATES = 50;
export const MAX_DREAMING_TEMPLATE_NAME_LENGTH = 256;

/** What a template sets: everything but whether and how often dreaming runs. */
export type DreamingTemplateConfig = Pick<
  AiIndexDreamingConfig,
  'instructions' | 'facts' | 'entities' | 'relationships'
>;

export interface DreamingTemplateSummary {
  id: string;
  name: string;
  description: string;
}

/** `index.json`. */
export interface DreamingTemplateIndex {
  templates: DreamingTemplateSummary[];
}

/** `<id>.json`. */
export interface DreamingTemplate {
  /**
   * What the AI index holds and who uses it. It opens the saved instructions, and can be edited
   * before saving.
   */
  summary: string;
  /** Why the ontology is shaped this way, shown alongside it. */
  rationale: string;
  /** The config, whose instructions follow the summary. */
  dreaming: DreamingTemplateConfig;
}

export type LoadedDreamingTemplate = DreamingTemplateSummary & DreamingTemplate;

/** Response of `GET /internal/context_engine/dreaming_templates`. */
export interface ListDreamingTemplatesResponse {
  templates: LoadedDreamingTemplate[];
}

/** The config to save: the template's, with the summary opening its instructions. */
export const buildDreamingTemplateConfig = (
  template: Pick<DreamingTemplate, 'dreaming'>,
  summary: string
): DreamingTemplateConfig => {
  const instructions = [summary.trim(), template.dreaming.instructions?.trim()]
    .filter(Boolean)
    .join('\n\n');
  return { ...template.dreaming, ...(instructions ? { instructions } : {}) };
};

/**
 * The template a saved config most likely came from: the one sharing the most fact types with it,
 * if any. Its entities are suggested when entities are turned on later.
 */
export const matchingTemplateId = (
  config: Pick<AiIndexDreamingConfig, 'facts'>,
  templates: ReadonlyArray<{ id: string; dreaming: DreamingTemplateConfig }>
): string | undefined => {
  const factTypes = new Set((config.facts ?? []).map(({ type }) => type));
  let best: { id: string; shared: number } | undefined;
  for (const { id, dreaming } of templates) {
    const shared = (dreaming.facts ?? []).filter(({ type }) => factTypes.has(type)).length;
    if (shared > (best?.shared ?? 0)) {
      best = { id, shared };
    }
  }
  return best?.id;
};
