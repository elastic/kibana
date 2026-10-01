/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTIC_INVESTIGATIONS_INTERNAL_URL } from '../constants';

/**
 * The `.kibana-` prefix is deliberate: `.kibana*` is already granted to the
 * `kibana_system` role, so this index needs no Elasticsearch-side system index
 * registration. Each entity this plugin owns gets its own index.
 */
export const IMPACT_INDEX_NAME = '.kibana-investigation-impact' as const;

export const IMPACT_INTERNAL_URL = `${AGENTIC_INVESTIGATIONS_INTERNAL_URL}/impact` as const;

/** Ceiling on `listByConversationIds` so a caller cannot ask for an unbounded terms query. */
export const MAX_IMPACT_CONVERSATION_IDS = 1000;

/**
 * Bound on conversation and space ids forwarded to Elasticsearch. Matches the
 * HTTP schema so an in-process caller cannot exceed the request size the route
 * already rejects.
 */
export const MAX_IMPACT_ID_LENGTH = 256;

/**
 * Stable entity id (Entity Store id, or a Knowledge Indicator `feature_id` when
 * that is the only identity). Display name is separate and optional.
 */
export const MAX_ENTITY_ID_LENGTH = 256;
/** Matches the title bound on Nightshift's investigation impact entity name. */
export const MAX_ENTITY_NAME_LENGTH = 512;
export const MAX_ENTITY_IDS = 100;
/**
 * Entities the agent may report through `investigations.set_impact`. The entity form is for a
 * handful of entities affected in different ways; more than this belongs in the summary.
 */
export const MAX_IMPACT_TOOL_ENTITIES = 10;

/** Agent Builder builtin tool that records an investigation's impact. */
export const SET_IMPACT_TOOL_ID = 'investigations.set_impact' as const;
