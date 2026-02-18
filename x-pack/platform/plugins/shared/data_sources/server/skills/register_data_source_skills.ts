/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common/tools';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills/tools';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { DataSource } from '@kbn/data-catalog-plugin';
import { z } from '@kbn/zod';
import {
  DATA_SOURCE_SAVED_OBJECT_TYPE,
  type DataSourceAttributes,
} from '../saved_objects';
import { readCatalogMarkdown } from './generate_skill_content';

const createDataSourceStatusTool = (dataSource: DataSource): BuiltinSkillBoundedTool => ({
  id: `data-sources.${dataSource.id}.check-status`,
  type: ToolType.builtin,
  description: `Check whether a ${dataSource.name} data source connection exists and is ready to use.`,
  schema: z.object({}),
  handler: async (_args, context) => {
    const { savedObjectsClient } = context;
    const found = await savedObjectsClient.find<DataSourceAttributes>({
      type: DATA_SOURCE_SAVED_OBJECT_TYPE,
      filter: `${DATA_SOURCE_SAVED_OBJECT_TYPE}.attributes.type: ${dataSource.id}`,
      perPage: 10,
    });

    if (found.total > 0) {
      const names = found.saved_objects.map((so) => so.attributes.name);
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: `${dataSource.name} is connected. Active connections: ${names.join(', ')}. You can use the ${dataSource.name} tools to search, read, and interact with data.`,
            },
          },
        ],
      };
    }

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            message: `${dataSource.name} is not connected. To connect, the user should navigate to the Data Sources management page in Kibana and add a new ${dataSource.name} connection with their credentials.`,
          },
        },
      ],
    };
  },
});

async function buildCatalogContent(
  dataSourceDefinitions: DataSource[]
): Promise<string> {
  const entries: string[] = [];
  for (const ds of dataSourceDefinitions) {
    const catalogDescription = await readCatalogMarkdown(ds);
    entries.push(
      `### ${ds.name}\n\n${catalogDescription}\n\nCheck connectivity: \`data-sources.${ds.id}.check-status\``
    );
  }

  return [
    '# Data Sources',
    '',
    'Data sources connect Kibana to external services. When a data source is connected, tools become available for searching, reading, and interacting with its data.',
    '',
    '## Available Data Source Types',
    '',
    entries.join('\n\n'),
    '',
    '## Usage',
    '',
    'Before using tools for a data source, check its connectivity status with the appropriate check-status tool above. If a data source is connected, its tools will be loaded automatically via a separate instance skill.',
  ].join('\n');
}

/**
 * Registers a single catalog skill for all data source types with the Agent Builder.
 * The skill lists available data source types with descriptions from CATALOG.md files,
 * and includes inline check-status tools for each type. Instance-specific skills with
 * dynamic tool IDs are registered separately when a data source is connected.
 */
export async function registerDataSourceSkills(
  agentBuilder: AgentBuilderPluginSetup,
  dataSourceDefinitions: DataSource[]
): Promise<void> {
  const statusTools = dataSourceDefinitions.map(createDataSourceStatusTool);
  const content = await buildCatalogContent(dataSourceDefinitions);

  agentBuilder.skills.register({
    id: 'data-sources-catalog',
    name: 'data-sources',
    basePath: 'skills/platform',
    description:
      'Data source connections for external services: code repositories, pull requests, issues (GitHub); documents, spreadsheets, presentations (Google Drive, SharePoint); knowledge bases, wikis, project tracking (Notion); issue tracking, sprints, bugs (Jira). Use this skill to check connectivity status or discover available data sources.',
    content,
    getInlineTools: () => statusTools,
  });
}
