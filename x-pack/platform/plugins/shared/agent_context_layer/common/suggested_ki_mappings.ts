/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Snapshot of the pre-relocation `.chat-sml-data` mapping, minus
 * autocomplete-only fields (`discovery_labels`) which are an
 * Agent-Builder-specific concern, not a generic Context Engine one.
 *
 * This is reference material for a FUTURE Context Engine index-template
 * feature (registering a live ES index template against a documented index
 * pattern, so customers opting into the pattern get a suggested KI mapping
 * automatically) — that feature is explicitly out of scope for this plan.
 *
 * Not consumed by any runtime code. Agent Builder's own copy of this mapping
 * (`agent_builder/server/services/sml/storage.ts`) now owns `.ab-sml-data`
 * outright and is free to diverge from this snapshot going forward.
 */
export const suggestedKiIndexMappings = {
  dynamic: 'strict' as const,
  properties: {
    id: { type: 'keyword' as const },
    type: { type: 'keyword' as const },
    title: { type: 'text' as const },
    origin: {
      properties: {
        uri: { type: 'keyword' as const },
      },
    },
    content: { type: 'text' as const },
    description: { type: 'text' as const },
    tags: { type: 'keyword' as const },
    references: {
      properties: {
        uri: { type: 'keyword' as const },
      },
    },
    extended_attrs: { type: 'flattened' as const },
    user_id: { type: 'keyword' as const },
    created_at: { type: 'date' as const },
    updated_at: { type: 'date' as const },
    spaces: { type: 'keyword' as const },
    permissions: {
      properties: {
        kibana: {
          properties: {
            privileges: {
              properties: {
                name: { type: 'keyword' as const },
              },
            },
          },
        },
        // Historical field: present in the pre-relocation mapping, but no SML
        // type ever populated it. Removed from Agent Builder's own live copy
        // of this mapping in the 2026-07-08 amendment (see
        // agent_builder/server/services/sml/storage.ts). A future
        // implementer of the Context Engine index-template feature should
        // deliberately decide whether to carry this forward, rather than
        // copying it by default.
        elasticsearch: {
          properties: {
            indices: {
              properties: {
                name: { type: 'keyword' as const },
              },
            },
          },
        },
      },
    },
    ingestion_method: { type: 'keyword' as const },
  },
};
