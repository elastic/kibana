/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/nightshift-ai';

/**
 * Nightshift source the indicator belongs to. Until sources replace streams as the
 * onboarding unit, the id is the stream name, which is why it is shown as-is.
 */
export const getKnowledgeIndicatorSourceId = (knowledgeIndicator: KnowledgeIndicator): string =>
  knowledgeIndicator.kind === 'feature'
    ? knowledgeIndicator.feature.source_id
    : knowledgeIndicator.source_id;
