/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { Skill } from '@kbn/agent-builder-common/skills';
import type { GetOsqueryAppContextFn } from './utils';
import { getOneChatContext } from './utils';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const osquerySchema = require('../../../public/common/schemas/osquery/v5.20.0.json');

const SCHEMA_SKILL: Omit<Skill, 'tools'> = {
  namespace: 'osquery.schema',
  name: 'Osquery Schema',
  description: 'Discover osquery table and column schemas',
  content: `# Osquery Schema Guide

This skill provides knowledge about osquery table and column schemas.

## Overview
Osquery exposes operating system information through SQL tables. Each table has a defined schema with columns that can be queried.

## Key Concepts

### Table Discovery
- List all available tables
- Get schema for a specific table
- Understand column types and descriptions

### Common Tables
- **processes**: Running processes
- **file**: File system information
- **users**: System users
- **groups**: User groups
- **network_interfaces**: Network interfaces
- **listening_ports**: Listening ports

## Usage Examples

### List all tables
\`\`\`
tool("get_schema", {
  table: null
})
\`\`\`

### Get schema for a specific table
\`\`\`
tool("get_schema", {
  table: "processes"
})
\`\`\`

## Best Practices
- Review table schemas before writing queries
- Use column descriptions to understand data types
- Check osquery documentation for table-specific notes
- Test queries on a small subset first
`,
};

/**
 * Creates a LangChain tool for browsing osquery table schemas.
 *
 * @param getOsqueryContext - Factory function that returns the OsqueryAppContext
 * @returns A LangChain tool configured for schema discovery
 * @internal
 */
const createGetSchemaTool = (getOsqueryContext: GetOsqueryAppContextFn) => {
  return tool(
    async ({ table }, config) => {
      // Context not strictly needed for schema lookup, but we validate it's available
      const onechatContext = getOneChatContext(config);
      if (!onechatContext) {
        throw new Error('OneChat context not available');
      }

      if (!table) {
        // Return list of all tables
        const tables = osquerySchema.map((t: any) => ({
          name: t.name,
          description: t.description,
          columns_count: t.columns?.length ?? 0,
        }));
        return JSON.stringify({ tables, total: tables.length });
      }

      // Return schema for specific table
      const tableSchema = osquerySchema.find((t: any) => t.name === table);
      if (!tableSchema) {
        throw new Error(`Table "${table}" not found in osquery schema`);
      }

      return JSON.stringify({
        table: tableSchema.name,
        description: tableSchema.description,
        columns: tableSchema.columns?.map((col: any) => ({
          name: col.name,
          type: col.type,
          description: col.description,
        })) ?? [],
      });
    },
    {
      name: 'get_schema',
      description: 'Get osquery table schema. Pass null or omit table to list all tables.',
      schema: z.object({
        table: z.string().nullable().optional().describe('Table name to get schema for. Omit or pass null to list all tables.'),
      }),
    }
  );
};

/**
 * Creates the Schema skill for discovering osquery table and column definitions.
 *
 * Use this skill to explore available osquery tables and their schemas before
 * writing queries. This helps ensure queries use correct table and column names.
 *
 * @param getOsqueryContext - Factory function that returns the OsqueryAppContext at runtime.
 *                            This allows lazy initialization and proper dependency injection.
 * @returns A Skill object containing the `get_schema` tool.
 *
 * @example
 * ```typescript
 * const schemaSkill = getSchemaSkill(() => osqueryAppContext);
 *
 * // The skill exposes one tool:
 * // - get_schema: Get table schema (table: string | null)
 * //   - Pass null/undefined to list all available tables
 * //   - Pass table name to get column definitions
 * ```
 *
 * @remarks
 * Schema data is loaded from the bundled osquery schema JSON file (currently v5.20.0).
 * Each table includes:
 * - Table name and description
 * - Column definitions with name, type, and description
 *
 * Common tables include: processes, file, users, groups, network_interfaces, listening_ports.
 *
 * @see {@link getLiveQuerySkill} for running queries against discovered tables
 * @see {@link getSavedQueriesSkill} for pre-built queries using these schemas
 */
export const getSchemaSkill = (getOsqueryContext: GetOsqueryAppContextFn): Skill => {
  return {
    ...SCHEMA_SKILL,
    tools: [createGetSchemaTool(getOsqueryContext)],
  };
};

