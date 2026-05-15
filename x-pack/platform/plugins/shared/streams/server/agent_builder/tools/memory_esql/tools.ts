/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { StaticEsqlTool, StaticWorkflowTool } from '@kbn/agent-builder-server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  MEMORIES_DATA_STREAM,
  WRITE_MEMORY_PAGE_WORKFLOW_NAME,
} from '../../../../common/constants';
import {
  STREAMS_MEMORY_GET_PAGE_TOOL_ID,
  STREAMS_MEMORY_SEARCH_PAGES_TOOL_ID,
  STREAMS_MEMORY_LIST_PAGES_TOOL_ID,
  STREAMS_MEMORY_GET_INSIGHTS_TOOL_ID,
  STREAMS_MEMORY_WRITE_PAGE_TOOL_ID,
} from './tool_ids';

const INSIGHTS_INDEX = '.kibana_streams_insights';

export const memoryGetPageTool: StaticEsqlTool = {
  id: STREAMS_MEMORY_GET_PAGE_TOOL_ID,
  type: ToolType.esql,
  description:
    'Fetch the latest non-deleted memory page by page_name. Returns the full content of the page.',
  tags: ['memory'],
  configuration: {
    query: `FROM ${MEMORIES_DATA_STREAM}
| WHERE \`page_name\` == ?page_name AND (\`is_deleted\` IS NULL OR \`is_deleted\` == false)
| STATS latest_ts = MAX(@timestamp) BY \`page_name\`
| KEEP \`page_name\`, \`title\`, \`content\`, \`categories\`, \`tags\`, \`references\`, \`@timestamp\``,
    params: {
      page_name: {
        type: 'string',
        description: 'The unique name of the memory page to fetch (e.g. "nginx-overview").',
      },
    },
  },
};

export const memorySearchPagesTool: StaticEsqlTool = {
  id: STREAMS_MEMORY_SEARCH_PAGES_TOOL_ID,
  type: ToolType.esql,
  description:
    'Full-text search across memory page content and titles. Returns matching page metadata and snippets.',
  tags: ['memory'],
  configuration: {
    query: `FROM ${MEMORIES_DATA_STREAM}
| WHERE MATCH(\`content\`, ?query) OR MATCH(\`title\`, ?query)
| WHERE \`is_deleted\` IS NULL OR \`is_deleted\` == false
| STATS latest_ts = MAX(@timestamp) BY \`page_name\`
| KEEP \`page_name\`, \`title\`, \`categories\`, \`tags\`, \`@timestamp\`
| LIMIT 20`,
    params: {
      query: {
        type: 'string',
        description: 'Full-text search query to match against page content and titles.',
      },
    },
  },
};

export const memoryListPagesTool: StaticEsqlTool = {
  id: STREAMS_MEMORY_LIST_PAGES_TOOL_ID,
  type: ToolType.esql,
  description:
    'List all current memory pages (latest per page_name, not deleted). Returns metadata only — use get_page for full content.',
  tags: ['memory'],
  configuration: {
    query: `FROM ${MEMORIES_DATA_STREAM}
| WHERE \`is_deleted\` IS NULL OR \`is_deleted\` == false
| STATS latest_ts = MAX(@timestamp) BY \`page_name\`
| KEEP \`page_name\`, \`title\`, \`categories\`, \`tags\`, \`@timestamp\`
| SORT \`page_name\` ASC
| LIMIT 200`,
    params: {},
  },
};

export const memoryGetInsightsTool: StaticEsqlTool = {
  id: STREAMS_MEMORY_GET_INSIGHTS_TOOL_ID,
  type: ToolType.esql,
  description:
    'Fetch recent insights from the significant events insights index. Useful for understanding what was recently discovered about the system.',
  tags: ['memory'],
  configuration: {
    query: `FROM ${INSIGHTS_INDEX}
| SORT generated_at DESC
| LIMIT 50`,
    params: {},
  },
};

export async function createMemoryWritePageTool(
  workflowsManagement: WorkflowsServerPluginSetup
): Promise<StaticWorkflowTool> {
  const { results } = await workflowsManagement.management.getWorkflows(
    { query: WRITE_MEMORY_PAGE_WORKFLOW_NAME, size: 50, page: 1 },
    DEFAULT_SPACE_ID
  );
  const workflow = results.find((w) => w.name === WRITE_MEMORY_PAGE_WORKFLOW_NAME);
  if (!workflow) {
    throw new Error(
      `"${WRITE_MEMORY_PAGE_WORKFLOW_NAME}" workflow not found. Deploy it via streams-program before starting Kibana.`
    );
  }
  return {
    id: STREAMS_MEMORY_WRITE_PAGE_TOOL_ID,
    type: ToolType.workflow,
    description:
      'Write or update a memory page. Creates a new append-only document in the memories data stream. ' +
      'Set is_deleted: true to soft-delete a page.',
    tags: ['memory'],
    configuration: {
      workflow_id: workflow.id,
      wait_for_completion: true,
    },
  };
}
