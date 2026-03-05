/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slugify } from './slugify';

/**
 * Returns the prefix shared by all workflow names belonging to a data source.
 * Used by the server to build full workflow names and by the UI to build
 * search queries that filter workflows for a specific data source.
 *
 * Full workflow name: `{workflowPrefix}.{workflowBaseName}`
 */
export const getWorkflowPrefix = (name: string, type: string): string =>
  `${slugify(name)}.source.${type}`;

/**
 * Returns the prefix shared by all tool IDs belonging to a data source.
 * Used by the server to build full tool IDs / MCP namespaces and by the UI
 * to build search queries that filter tools for a specific data source.
 *
 * Workflow tool ID: `{toolPrefix}.source.{workflowBaseName}`
 * MCP namespace:    `{toolPrefix}`
 */
export const getToolPrefix = (name: string, type: string): string => `${type}.${slugify(name)}`;
