/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slugify } from './slugify';

/**
 * Returns the prefix shared by all tool IDs belonging to a data source.
 * Used by the server to build full tool IDs / MCP namespaces and by the UI
 * to build search queries that filter tools for a specific data source.
 *
 * Format: `{name}.{type}` -- shared by both workflow tools and MCP tools.
 *
 * Workflow tool ID: `{toolPrefix}.source.{workflowBaseName}`
 * MCP tool ID:      `{toolPrefix}.{mcpToolName}`
 */
export const getToolPrefix = (name: string, type: string): string => `${slugify(name)}.${type}`;

/**
 * Returns the prefix shared by all workflow names belonging to a data source.
 * Used by the server to build full workflow names and by the UI to build
 * search queries that filter workflows for a specific data source.
 *
 * Format: `{name}.{type}.source` -- extends the tool prefix with `.source.`
 * so that workflow names and workflow tool IDs are identical.
 *
 * Full workflow name: `{workflowPrefix}.{workflowBaseName}`
 */
export const getWorkflowPrefix = (name: string, type: string): string =>
  `${getToolPrefix(name, type)}.source`;
