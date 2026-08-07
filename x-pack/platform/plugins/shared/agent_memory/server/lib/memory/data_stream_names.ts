/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Names of the two hidden data streams backing memory.
 *
 * Both are written with the requesting user's credentials, so the names
 * deliberately avoid the `.kibana*` prefixes Elasticsearch treats as system
 * indices.
 *
 * Neither name may be a prefix of the other. Index templates match on
 * `<name>*`, so a `.agent-memory` template would also match
 * `.agent-memory-history`, and Elasticsearch rejects two templates that match
 * the same index at the same priority.
 *
 * Deployments still carrying pages under the historical `.significant_events-*`
 * names keep them until their retention expires; see the plugin README.
 */
export const MEMORIES_DATA_STREAM = '.agent-memory-pages';
export const MEMORY_HISTORY_DATA_STREAM = '.agent-memory-history';
