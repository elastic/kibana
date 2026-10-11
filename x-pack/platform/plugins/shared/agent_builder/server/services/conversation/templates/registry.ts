/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';

/**
 * Module-level map of registered conversation templates. Populated synchronously
 * when templates are registered at plugin setup, before any conversation client is created.
 * Enables sync access inside OCC field callbacks and converter functions that cannot be async.
 */
const templates = new Map<string, ConversationTemplate>();

export const registerTemplate = (template: ConversationTemplate): void => {
  templates.set(template.id, template);
};

export const getTemplate = (id: string): ConversationTemplate | undefined => templates.get(id);
