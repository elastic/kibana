/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetadataFieldValue } from '@kbn/agent-builder-common';
import type { Investigation } from '../types';

/** Resolves the investigation backing an Agent Builder conversation. */
export type InvestigationLoader = (conversationId: string) => Promise<Investigation>;

/** Persists conversation template metadata (e.g. status, assignees). */
export type MetadataPatcher = (
  conversationId: string,
  metadata: Record<string, MetadataFieldValue>
) => Promise<void>;

export interface TemplateBindings {
  loadInvestigation: InvestigationLoader;
  patchMetadata?: MetadataPatcher;
}

/**
 * The tab components below are registered with Agent Builder once and shared by every solution,
 * but each solution loads its investigations from its own API. Keying the bindings by template id
 * lets one set of components resolve the right solution at render time, from
 * `conversation.template_id`.
 */
const bindingsByTemplateId = new Map<string, TemplateBindings>();

export const setTemplateBindings = (templateId: string, bindings: TemplateBindings): void => {
  bindingsByTemplateId.set(templateId, bindings);
};

export const getTemplateBindings = (templateId?: string): TemplateBindings | undefined =>
  templateId ? bindingsByTemplateId.get(templateId) : undefined;
