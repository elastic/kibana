/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { customAppsTools } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { describeCatalog } from '../../common/describe_catalog';
import { catalogForPrompt as fullCatalog } from '../../common/catalog_schema';
import { PLUGIN_ID } from '../../common/constants';
import { createCustomApp, InvalidCustomAppError, listCustomApps } from '../custom_app_service';

const createAppSchema = z.object({
  definition: z
    .unknown()
    .describe(
      'The complete custom app definition: { version: 1, title, description?, layout, panels, surfaces }.'
    ),
});

const listAppsSchema = z.object({});

export const createCreateAppTool = (): BuiltinToolDefinition<typeof createAppSchema> => ({
  id: customAppsTools.createApp,
  type: ToolType.builtin,
  tags: ['custom_apps'],
  annotations: {
    title: 'Create custom app',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  description: dedent`
    Create a Kibana "custom app" — a page built entirely from declarative JSON, rendered with EUI.
    Never emit HTML or JavaScript; only the components in the catalog below exist.

    The definition has this shape:
      version: always 1
      title:   short page title
      layout:  grid geometry keyed by panel id. Each entry is
               { type: "panel", id, row, column, width, height }.
               The grid is 48 columns wide; height is in rows of 20px.
               Lay panels out without overlapping.
      panels:  { <panelId>: { title } } — the panel header
      surfaces: { <panelId>: [ A2UI messages ] } — the contents of that panel
      queries: { <panelId>: [ { query, path, shape } ] } — optional ES|QL data

    Getting data — prefer ES|QL for anything real:
      Put an ES|QL query in 'queries' and its results land in that panel's data
      model at 'path', where components bind to them like any other value.
        shape "rows"  -> an array of row objects (for Table and Chart)
        shape "first" -> the first row as one object (for a few Stat tiles)
        shape "value" -> the first cell only (for a single number)
      The page time picker is applied automatically to whatever time field the
      queried index has, so do not put a time range in the query itself.
      Name every output column in the query (STATS x = COUNT(*) BY y = field),
      then bind to those exact names.

      Always SORT a query that returns a list, and end the SORT on something
      unique per row — either the grouping key, or an extra column after the
      metric. ES|QL does not break ties deterministically, so two rows with the
      same value swap places between runs, which shows up as rows flickering
      whenever the panel re-renders.
        bad:  ... | STATS pods = COUNT(*) BY namespace | SORT pods DESC
        good: ... | STATS pods = COUNT(*) BY namespace | SORT pods DESC, namespace ASC

      Example: a query { "path": "/series", "shape": "rows",
        "query": "FROM logs | STATS requests = COUNT(*) BY time = BUCKET(@timestamp, 1 day) | SORT time" }
      feeds a chart { "component": "Chart", "chartType": "line",
        "rows": {"path": "/series"}, "x": "time", "y": "requests" }.

      Only hardcode values into dataModel for things that genuinely are static,
      such as form defaults.

    Each surface is normally one message:
      { "version": "v1.0", "createSurface": { "surfaceId": "<panelId>",
        "catalogId": "${fullCatalog.catalogId}",
        "dataModel": { ... }, "components": [ ... ] } }

    Components are a flat list; parents reference children by id, and exactly one
    component must have the id "root".

    All panels in an app share ONE data model, so JSON pointers are app-wide and
    two panels must never claim the same top-level key. That sharing is what lets
    a filter panel drive another panel's query. Name paths accordingly:
      /filters/...        controls one panel owns and other panels' queries read
      /<queryName>        query results, named after what they hold
      /ui/<panelId>/...   scratch state local to a panel, such as a modal's
                          open flag, prefixed so it cannot collide

    ${describeCatalog(fullCatalog)}

    Worked example — a panel with a form whose button is disabled until it is filled in:

    "surfaces": { "restart": [ { "version": "v1.0", "createSurface": {
      "surfaceId": "restart", "catalogId": "${fullCatalog.catalogId}",
      "dataModel": { "form": { "service": "checkout", "note": "" } },
      "components": [
        { "id": "root", "component": "Column", "children": ["svc", "note", "go"] },
        { "id": "svc", "component": "ChoicePicker", "label": "Service",
          "value": { "path": "/form/service" },
          "options": [{ "label": "checkout", "value": "checkout" }] },
        { "id": "note", "component": "TextField", "label": "Reason",
          "value": { "path": "/form/note" } },
        { "id": "go", "component": "Button", "label": "Restart", "variant": "primary",
          "disabled": { "call": "isEmpty", "args": { "value": { "path": "/form/note" } } },
          "action": { "event": { "name": "kbn.runWorkflow", "context": {
            "workflowId": "restart-service", "service": { "path": "/form/service" } } } } }
      ] } } ] }

    Note how every value the user can change is a {"path": ...} binding into dataModel,
    and how the button reads those same paths back out in its action context.

    Returns the created app's id and a link.
  `,
  schema: createAppSchema,
  handler: async ({ definition }, context) => {
    try {
      const client = context.savedObjectsClient;
      const created = await createCustomApp(client, definition);
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              id: created.id,
              title: created.definition.title,
              path: `/app/${PLUGIN_ID}/app/${created.id}`,
            },
          },
        ],
      };
    } catch (error) {
      // A schema failure is the agent's problem to fix, so hand back the exact
      // validation message rather than a generic failure.
      const message =
        error instanceof InvalidCustomAppError
          ? `The definition was rejected: ${error.message}`
          : error.message;
      context.logger.error(`Error running ${customAppsTools.createApp}: ${message}`);
      return { results: [{ type: ToolResultType.error, data: { message } }] };
    }
  },
});

export const createListAppsTool = (): BuiltinToolDefinition<typeof listAppsSchema> => ({
  id: customAppsTools.listApps,
  type: ToolType.builtin,
  tags: ['custom_apps'],
  annotations: {
    title: 'List custom apps',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  description: 'List the custom apps in the current space, with their ids and titles.',
  schema: listAppsSchema,
  handler: async (_params, context) => {
    try {
      const client = context.savedObjectsClient;
      return {
        results: [{ type: ToolResultType.other, data: { apps: await listCustomApps(client) } }],
      };
    } catch (error) {
      context.logger.error(`Error running ${customAppsTools.listApps}: ${error.message}`);
      return { results: [{ type: ToolResultType.error, data: { message: error.message } }] };
    }
  },
});
