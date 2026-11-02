/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * "Stage B3": static import graph, no runtime. Importing `stack_connectors`'s own connector-type
 * index pulls in every built-in connector's module (and its SDK client, if any) the same way
 * `registerConnectorTypes()` would at plugin setup — this file never calls it, it only needs the
 * imports to exist for `analyze_meta.mjs` to size "bundle every connector" against Stage B2's
 * hand-picked two-connector set. Not meant to run; `main_size_only_all_connectors.ts` is not wired
 * to a pod entry.
 */
export { registerConnectorTypes } from '../../../../../stack_connectors/server/connector_types';
export { ActionsClient } from '../../../../../actions/server/actions_client';
