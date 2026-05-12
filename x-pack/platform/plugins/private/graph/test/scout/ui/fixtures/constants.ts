/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared sample graph workspaces and saved-object attributes used by the
 * graph listing Scout specs. Hoisted into the fixtures module so spec files
 * can't drift on shape (the `kbnClient.savedObjects.create` payloads have
 * to stay in lockstep with the `graph-workspace` saved-object schema).
 */

export const GRAPH_A = { title: 'Graph Alpha', description: 'First test graph' };
export const GRAPH_B = { title: 'Graph Beta', description: 'Second test graph' };

/**
 * Required saved-object fields for a `graph-workspace` beyond `title` and
 * `description`. Empty workspace state is fine for listing-only coverage.
 */
export const WORKSPACE_ATTRS = { numLinks: 0, numVertices: 0, wsState: '{}', version: 1 };
