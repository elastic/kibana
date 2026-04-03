/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { LensConfigBuilder as LensConfigBuilderImpl } from '@kbn/lens-embeddable-utils/config_builder';
import { LENS_CONTENT_TYPE } from '@kbn/lens-common/content_management/constants';
import { LENS_UNKNOWN_VIS } from '@kbn/lens-common';
import { isLensESQLConfig } from '@kbn/lens-embeddable-utils';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import { z } from '@kbn/zod/v4';

const DASHBOARD_SO_TYPE = 'dashboard';
const LENS_API_VERSION = 1;

// ---------------------------------------------------------------------------
// Tool IDs — dot-namespaced, consistent with agent builder conventions
// ---------------------------------------------------------------------------

const DASHBOARD_NAMESPACE = 'platform.dashboard';
const VISUALIZATIONS_NAMESPACE = 'platform.visualizations';

export const dashboardMcpToolIds = {
  get: `${DASHBOARD_NAMESPACE}.get`,
  create: `${DASHBOARD_NAMESPACE}.create`,
  update: `${DASHBOARD_NAMESPACE}.update`,
  delete: `${DASHBOARD_NAMESPACE}.delete`,
  list: `${DASHBOARD_NAMESPACE}.list`,
  search: `${DASHBOARD_NAMESPACE}.search`,
} as const;

export const visualizationMcpToolIds = {
  list: `${VISUALIZATIONS_NAMESPACE}.list`,
  get: `${VISUALIZATIONS_NAMESPACE}.get`,
  create: `${VISUALIZATIONS_NAMESPACE}.create`,
  update: `${VISUALIZATIONS_NAMESPACE}.update`,
  delete: `${VISUALIZATIONS_NAMESPACE}.delete`,
} as const;

/**
 * Checks whether a dot-namespaced tool ID matches the given namespace filter.
 * When no filter is provided, all tools are included.
 */
const matchesNamespaceFilter = (toolId: string, namespaceFilter?: Set<string>): boolean => {
  if (!namespaceFilter) {
    return true;
  }
  const lastDotIndex = toolId.lastIndexOf('.');
  if (lastDotIndex <= 0) {
    return false;
  }
  const toolNamespace = toolId.substring(0, lastDotIndex);
  return namespaceFilter.has(toolNamespace);
};

/**
 * Minimal type for Lens saved object attributes as returned by the content management client.
 * We avoid importing internal Lens types directly; the content client returns these shapes.
 */
interface LensSavedObjectItem {
  id: string;
  type: string;
  references: Array<{ name: string; type: string; id: string }>;
  attributes: {
    title?: string;
    description?: string;
    visualizationType?: string;
    state?: Record<string, unknown>;
    [key: string]: unknown;
  };
  managed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  error?: unknown;
}

// ---------------------------------------------------------------------------
// Dashboard helpers using SavedObjects client directly
// ---------------------------------------------------------------------------

/**
 * Transforms raw dashboard SO attributes into a simplified API response shape.
 * This mirrors the public API response format without requiring the full
 * dashboard state schema validation pipeline.
 */
const transformDashboardSoToResponse = (so: {
  id: string;
  attributes: unknown;
  references?: Array<{ name: string; type: string; id: string }>;
}) => {
  const attrs = (so.attributes ?? {}) as Record<string, unknown>;
  const refs = so.references ?? [];

  // Extract tag references
  const tags = refs.filter((r) => r.type === 'tag').map((r) => r.id);

  // Build time_range from stored fields
  const timeRestore = attrs.timeRestore as boolean | undefined;
  const timeFrom = attrs.timeFrom as string | undefined;
  const timeTo = attrs.timeTo as string | undefined;
  const timeRange = timeRestore && timeFrom && timeTo ? { from: timeFrom, to: timeTo } : undefined;

  const result: {
    id: string;
    data: {
      title: string;
      description?: string;
      tags?: string[];
      time_range?: { from: string; to: string };
    };
  } = {
    id: so.id,
    data: {
      title: (attrs.title as string) ?? '',
    },
  };

  if (attrs.description) {
    result.data.description = attrs.description as string;
  }
  if (tags.length > 0) {
    result.data.tags = tags;
  }
  if (timeRange) {
    result.data.time_range = timeRange;
  }

  return result;
};

// ---------------------------------------------------------------------------
// Lens helpers using Content Management client
// ---------------------------------------------------------------------------

const getLensResponseItem = (builder: LensConfigBuilder, item: LensSavedObjectItem) => {
  const { id, references, attributes } = item;

  // Use type assertion to bridge our minimal type to the full Lens type
  // The builder.toAPIFormat expects the full LensDocument shape, but we only
  // need it to transform the data — the runtime values are correct.
  const data = builder.toAPIFormat({
    references,
    ...attributes,
    state: attributes.state,
    visualizationType: attributes.visualizationType ?? LENS_UNKNOWN_VIS,
  } as Parameters<LensConfigBuilder['toAPIFormat']>[0]);

  return {
    id,
    data,
    meta: {
      type: item.type,
      managed: item.managed,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      created_by: item.createdBy,
      updated_by: item.updatedBy,
    },
  };
};

const getLensRequestConfig = (builder: LensConfigBuilder, config: Record<string, unknown>) => {
  // The builder.fromAPIFormat expects specific Lens config types, but the MCP tool
  // receives arbitrary JSON from the user. The builder handles validation internally.
  return builder.fromAPIFormat(config as Parameters<LensConfigBuilder['fromAPIFormat']>[0]);
};

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers dashboard and Lens visualization CRUD tools on the MCP server.
 *
 * Tools are registered with dot-namespaced IDs (e.g. `platform.dashboard.list`)
 * that are sanitized to underscores for MCP (e.g. `platform_dashboard_list`).
 * The optional `namespaces` parameter filters which tools are registered,
 * using the same namespace matching as the agent builder tool registry.
 *
 * Dashboard tools use the SavedObjects client from the request handler context.
 * Lens tools use the Content Management client (same as the Lens HTTP API routes).
 */
export const registerDashboardsMcpTools = (
  server: McpServer,
  request: KibanaRequest,
  ctx: RequestHandlerContext,
  contentManagement?: ContentManagementServerSetup,
  namespaces?: string
): void => {
  const builder = new LensConfigBuilderImpl();

  // Parse namespace filter once
  const namespaceFilter = namespaces?.trim()
    ? new Set(
        namespaces
          .split(',')
          .map((ns) => ns.trim())
          .filter(Boolean)
      )
    : undefined;

  /**
   * Registers a tool on the MCP server if its namespaced ID passes the namespace filter.
   * The dot-namespaced ID is sanitized to underscores for MCP compatibility.
   */
  const registerTool: (toolId: string, ...args: unknown[]) => void = (toolId, ...args) => {
    if (!matchesNamespaceFilter(toolId, namespaceFilter)) {
      return;
    }
    (server.tool as (...a: unknown[]) => void)(sanitizeToolId(toolId), ...args);
  };

  // ---------------------------------------------------------------------------
  // Dashboard Tools
  // ---------------------------------------------------------------------------

  registerTool(
    dashboardMcpToolIds.get,
    'Get a Kibana dashboard by ID. Returns the full dashboard definition including title, panels, and metadata.',
    { id: z.string().describe('The dashboard ID') },
    async ({ id }: { id: string }) => {
      try {
        const { core } = await ctx.resolve(['core']);
        const soClient = core.savedObjects.client;
        const { saved_object: savedObject } = await soClient.resolve(DASHBOARD_SO_TYPE, id);
        const result = transformDashboardSoToResponse(savedObject);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: error instanceof Error ? error.message : String(error) },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  registerTool(
    dashboardMcpToolIds.create,
    `Create a new Kibana dashboard. Provide a JSON definition with title and panels.
The dashboard uses a 48-column grid system. Panels can contain inline Lens visualizations.
Example: { "title": "My Dashboard", "panels": [{ "type": "lens", "uid": "panel1", "grid": { "x": 0, "y": 0, "w": 24, "h": 15 }, "config": { "attributes": { "type": "metric", "dataset": { "type": "esql", "query": "FROM logs | STATS count = COUNT()" }, "metrics": [{ "type": "primary", "operation": "value", "column": "count" }] } } }], "time_range": { "from": "now-24h", "to": "now" } }`,
    {
      definition: z
        .string()
        .describe(
          'JSON string of the dashboard definition. Must include "title" and "panels" at the root level. Optional: "time_range".'
        ),
    },
    async ({ definition }: { definition: string }) => {
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(definition);
      } catch {
        return {
          content: [{ type: 'text' as const, text: 'Error: Invalid JSON in definition' }],
          isError: true,
        };
      }

      try {
        // Unwrap legacy { data: {...} } format if needed
        const requestBody = body.data ? (body.data as Record<string, unknown>) : body;
        const { id: _id, spaces: _spaces, ...cleanBody } = requestBody;

        const { core } = await ctx.resolve(['core']);
        const soClient = core.savedObjects.client;

        // Build SO attributes from the API body
        const { title, description, panels, time_range: timeRange, tags, ...rest } = cleanBody;

        const attributes: Record<string, unknown> = {
          title: title ?? '',
          description: description ?? '',
          panelsJSON: panels ? JSON.stringify(panels) : '[]',
          ...rest,
        };

        if (timeRange && typeof timeRange === 'object') {
          const tr = timeRange as { from?: string; to?: string };
          attributes.timeRestore = true;
          attributes.timeFrom = tr.from;
          attributes.timeTo = tr.to;
        }

        // Build tag references
        const references: Array<{ name: string; type: string; id: string }> = [];
        if (Array.isArray(tags)) {
          (tags as string[]).forEach((tagId, index) => {
            references.push({ name: `tag-${index}`, type: 'tag', id: tagId });
          });
        }

        const savedObject = await soClient.create(DASHBOARD_SO_TYPE, attributes, { references });
        const result = transformDashboardSoToResponse(savedObject);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: error instanceof Error ? error.message : String(error) },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  registerTool(
    dashboardMcpToolIds.update,
    'Update an existing Kibana dashboard by ID. Provide the full updated dashboard definition (title, panels, etc.).',
    {
      id: z.string().describe('The dashboard ID to update'),
      definition: z
        .string()
        .describe(
          'JSON string of the updated dashboard definition. Include "title" and "panels" at the root level.'
        ),
    },
    async ({ id, definition }: { id: string; definition: string }) => {
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(definition);
      } catch {
        return {
          content: [{ type: 'text' as const, text: 'Error: Invalid JSON in definition' }],
          isError: true,
        };
      }

      try {
        // Unwrap legacy { data: {...} } format if needed
        const requestBody = body.data ? (body.data as Record<string, unknown>) : body;
        const { id: _id, spaces: _spaces, ...cleanBody } = requestBody;

        const { core } = await ctx.resolve(['core']);
        const soClient = core.savedObjects.client;

        const { title, description, panels, time_range: timeRange, tags, ...rest } = cleanBody;

        const attributes: Record<string, unknown> = {
          title: title ?? '',
          description: description ?? '',
          panelsJSON: panels ? JSON.stringify(panels) : '[]',
          ...rest,
        };

        if (timeRange && typeof timeRange === 'object') {
          const tr = timeRange as { from?: string; to?: string };
          attributes.timeRestore = true;
          attributes.timeFrom = tr.from;
          attributes.timeTo = tr.to;
        }

        const references: Array<{ name: string; type: string; id: string }> = [];
        if (Array.isArray(tags)) {
          (tags as string[]).forEach((tagId, index) => {
            references.push({ name: `tag-${index}`, type: 'tag', id: tagId });
          });
        }

        const savedObject = await soClient.update(DASHBOARD_SO_TYPE, id, attributes, {
          references,
          mergeAttributes: false,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ id: savedObject.id, success: true }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: error instanceof Error ? error.message : String(error) },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  registerTool(
    dashboardMcpToolIds.delete,
    'Delete a Kibana dashboard by ID.',
    { id: z.string().describe('The dashboard ID to delete') },
    async ({ id }: { id: string }) => {
      try {
        const { core } = await ctx.resolve(['core']);
        const soClient = core.savedObjects.client;
        await soClient.delete(DASHBOARD_SO_TYPE, id);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Dashboard "${id}" deleted successfully.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: error instanceof Error ? error.message : String(error) },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  registerTool(
    dashboardMcpToolIds.list,
    'List all Kibana dashboards with pagination. Returns dashboard titles, descriptions, and metadata.',
    {
      page: z.number().optional().describe('Page number (default: 1)'),
      per_page: z.number().optional().describe('Results per page (default: 100)'),
    },
    async ({ page, per_page }: { page?: number; per_page?: number }) => {
      try {
        const { core } = await ctx.resolve(['core']);
        const soClient = core.savedObjects.client;

        const soResponse = await soClient.find({
          type: DASHBOARD_SO_TYPE,
          fields: ['description', 'title', 'timeFrom', 'timeTo', 'timeRestore'],
          perPage: per_page ?? 100,
          page: page ?? 1,
        });

        const dashboards = soResponse.saved_objects.map((so) => transformDashboardSoToResponse(so));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { dashboards, total: soResponse.total, page: soResponse.page },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: error instanceof Error ? error.message : String(error) },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  registerTool(
    dashboardMcpToolIds.search,
    'Search dashboards by title and description.',
    {
      query: z.string().describe('Search query to filter dashboards by title and description'),
      page: z.number().optional().describe('Page number (default: 1)'),
      per_page: z.number().optional().describe('Results per page (default: 100)'),
    },
    async ({ query, page, per_page }: { query: string; page?: number; per_page?: number }) => {
      try {
        const { core } = await ctx.resolve(['core']);
        const soClient = core.savedObjects.client;

        const soResponse = await soClient.find({
          type: DASHBOARD_SO_TYPE,
          searchFields: ['title^3', 'description'],
          fields: ['description', 'title', 'timeFrom', 'timeTo', 'timeRestore'],
          search: query,
          perPage: per_page ?? 100,
          page: page ?? 1,
          defaultSearchOperator: 'AND' as const,
        });

        const dashboards = soResponse.saved_objects.map((so) => transformDashboardSoToResponse(so));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { dashboards, total: soResponse.total, page: soResponse.page },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: error instanceof Error ? error.message : String(error) },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ---------------------------------------------------------------------------
  // Lens Visualization Tools
  // ---------------------------------------------------------------------------

  if (!contentManagement) {
    // contentManagement is an optional dependency — skip Lens tools if unavailable
    return;
  }

  const getLensClient = () => {
    return contentManagement.contentClient
      .getForRequest({ request, requestHandlerContext: ctx })
      .for<LensSavedObjectItem>(LENS_CONTENT_TYPE, LENS_API_VERSION);
  };

  registerTool(
    visualizationMcpToolIds.list,
    'List Lens visualizations in Kibana. Optionally filter by search query.',
    {
      query: z.string().optional().describe('Optional search query to filter visualizations'),
      page: z.number().optional().describe('Page number (default: 1)'),
      per_page: z.number().optional().describe('Results per page (default: 100)'),
    },
    async ({
      query: q,
      page,
      per_page: perPage,
    }: {
      query?: string;
      page?: number;
      per_page?: number;
    }) => {
      try {
        const client = getLensClient();
        const searchQuery = {
          text: q,
          cursor: (page ?? 1).toString(),
          limit: perPage ?? 100,
        };

        const {
          result: { hits, pagination },
        } = await client.search(searchQuery, {});

        const data = hits.map((item) => getLensResponseItem(builder, item));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  data,
                  meta: { page: page ?? 1, per_page: perPage ?? 100, total: pagination.total },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: error instanceof Error ? error.message : String(error) },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  registerTool(
    visualizationMcpToolIds.get,
    'Get a Lens visualization by ID. Returns the full visualization definition and metadata.',
    { id: z.string().describe('The visualization ID') },
    async ({ id }: { id: string }) => {
      try {
        const client = getLensClient();
        const { result } = await client.get(id);

        if (result.item.error) {
          throw result.item.error;
        }

        const responseItem = getLensResponseItem(builder, result.item);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(responseItem, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: error instanceof Error ? error.message : String(error) },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  registerTool(
    visualizationMcpToolIds.create,
    `Create a new Lens visualization. Provide a JSON definition with the chart type and configuration.
Supported types: metric, xy, gauge, heatmap, tagcloud, datatable, region_map, pie, donut, treemap, mosaic, waffle.
ES|QL example: { "type": "metric", "dataset": { "type": "esql", "query": "FROM logs | STATS count = COUNT()" }, "metrics": [{ "type": "primary", "operation": "value", "column": "count" }] }
XY example: { "type": "xy", "layers": [{ "type": "bar", "dataset": { "type": "esql", "query": "FROM logs | STATS count = COUNT() BY status" }, "x": { "operation": "value", "column": "status" }, "y": [{ "operation": "value", "column": "count" }] }] }`,
    {
      definition: z
        .string()
        .describe(
          'JSON string of the visualization definition. Must include "type" and chart-specific configuration.'
        ),
    },
    async ({ definition }: { definition: string }) => {
      let config: Record<string, unknown>;
      try {
        config = JSON.parse(definition);
      } catch {
        return {
          content: [{ type: 'text' as const, text: 'Error: Invalid JSON in definition' }],
          isError: true,
        };
      }

      if (isLensESQLConfig(config as any)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'ES|QL charts are not yet supported in Lens. Use POST /api/dashboards instead.',
            },
          ],
          isError: true,
        };
      }

      try {
        const client = getLensClient();
        const { references, ...data } = getLensRequestConfig(builder, config);
        const { result } = await client.create(data, { references });

        if (result.item.error) {
          throw result.item.error;
        }

        const responseItem = getLensResponseItem(builder, result.item);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(responseItem, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: error instanceof Error ? error.message : String(error) },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  registerTool(
    visualizationMcpToolIds.update,
    'Update an existing Lens visualization by ID. Provide the full updated visualization definition.',
    {
      id: z.string().describe('The visualization ID to update'),
      definition: z.string().describe('JSON string of the updated visualization definition.'),
    },
    async ({ id, definition }: { id: string; definition: string }) => {
      let config: Record<string, unknown>;
      try {
        config = JSON.parse(definition);
      } catch {
        return {
          content: [{ type: 'text' as const, text: 'Error: Invalid JSON in definition' }],
          isError: true,
        };
      }

      if (isLensESQLConfig(config as any)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'ES|QL charts are not yet supported in Lens.',
            },
          ],
          isError: true,
        };
      }

      try {
        const client = getLensClient();
        const { references, ...data } = getLensRequestConfig(builder, config);
        const { result } = await client.update(id, data, { references });

        if (result.item.error) {
          throw result.item.error;
        }

        const responseItem = getLensResponseItem(builder, result.item);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(responseItem, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: error instanceof Error ? error.message : String(error) },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  registerTool(
    visualizationMcpToolIds.delete,
    'Delete a Lens visualization by ID.',
    { id: z.string().describe('The visualization ID to delete') },
    async ({ id }: { id: string }) => {
      try {
        const client = getLensClient();
        const { result } = await client.delete(id);

        if (!result.success) {
          throw new Error(`Failed to delete Lens visualization with id [${id}].`);
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Visualization "${id}" deleted successfully.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: error instanceof Error ? error.message : String(error) },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );
};
