/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ManualTriggerSchema } from '@kbn/workflows';
import type { JsonSchema, WorkflowListDto } from '@kbn/workflows';
import { ACTION_WORKFLOW_TAG, actionMetadataSchema } from '@kbn/workflows/managed';
import type { ActionMetadata } from '@kbn/workflows/managed';
import type { ActionCatalogEntry, ListActionsResponse } from '@kbn/proposals-common';

/** Which workflows the catalog reads: managed installs, the space's own, or both. */
export type ActionCatalogManagedFilter = 'all' | 'managed' | 'unmanaged';

/** What the catalog needs from workflows management: a paged, tag-filtered listing. */
export interface ActionCatalogWorkflowsClient {
  getWorkflows(
    params: {
      tags: string[];
      enabled: boolean[];
      page: number;
      size: number;
      managedFilter: ActionCatalogManagedFilter;
    },
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowListDto>;
}

export interface ListActionsOptions {
  /**
   * Category keywords to keep; an action matches when its category is any of them. Omit to list
   * every action.
   */
  categories?: string[];
  /**
   * Which workflows to read. Defaults to `managed`: the actions a solution installs. `unmanaged`
   * lists the action workflows the space's users wrote themselves, and `all` both.
   */
  managedFilter?: ActionCatalogManagedFilter;
}

/** Structural subset of a workflow definition the catalog reads. */
interface ActionWorkflowDefinition {
  consts?: { actionMetadata?: unknown };
  triggers?: Array<{
    type?: string;
    inputs?: unknown;
  }>;
}

const PAGE_SIZE = 100;

/**
 * Parses the `consts.actionMetadata` an action workflow declares, or returns `undefined` (and
 * warns) when it is invalid. Shared by the catalog and by proposal creation, so both accept the
 * same definitions.
 */
export const parseActionMetadata = (
  workflowId: string,
  candidate: unknown,
  logger: Logger
): ActionMetadata | undefined => {
  if (candidate === undefined || candidate === null) {
    return undefined;
  }
  const parsed = actionMetadataSchema.safeParse(candidate);
  if (!parsed.success) {
    logger.warn(
      `Action workflow [${workflowId}] declares invalid consts.actionMetadata: ${parsed.error.message}`
    );
    return undefined;
  }
  return parsed.data;
};

/**
 * Action catalog: lists the action workflows a space can propose and projects them to the
 * lightweight {@link ActionCatalogEntry} shape an agent reads.
 *
 * Discovery is tag-driven (`action`), never a hardcoded workflow-id list, and category is a
 * solution-owned keyword — never validated against an enum. Definitions declaring invalid
 * `consts.actionMetadata` are skipped with a warning rather than failing the whole catalog.
 */
export class ActionCatalog {
  constructor(
    private readonly getWorkflows: () => ActionCatalogWorkflowsClient | undefined,
    private readonly logger: Logger
  ) {}

  async list(
    spaceId: string,
    request: KibanaRequest,
    { categories, managedFilter = 'managed' }: ListActionsOptions = {}
  ): Promise<ListActionsResponse> {
    const workflows = this.getWorkflows();
    if (!workflows) {
      throw new Error('Workflows management is not available');
    }

    const filter = categories && categories.length > 0 ? new Set(categories) : undefined;

    const actions: ActionCatalogEntry[] = [];
    let page = 1;
    // Page until exhausted. The catalog is small (action workflows only): the tag filter runs
    // server-side inside getWorkflows.
    for (;;) {
      const response = await workflows.getWorkflows(
        // Disabled workflows are left out: a proposal for one could only fail once approved.
        { tags: [ACTION_WORKFLOW_TAG], enabled: [true], page, size: PAGE_SIZE, managedFilter },
        spaceId,
        request
      );
      for (const item of response.results) {
        const entry = this.toEntry(item.id, item.definition as ActionWorkflowDefinition | null);
        if (!entry) {
          continue;
        }
        if (filter && (entry.category === undefined || !filter.has(entry.category))) {
          continue;
        }
        actions.push(entry);
      }
      if (page * PAGE_SIZE >= response.total) {
        break;
      }
      page += 1;
    }

    actions.sort((a, b) => a.name.localeCompare(b.name));
    return { actions, total: actions.length };
  }

  /**
   * Projects a workflow definition to a catalog entry, or `undefined` when the
   * definition carries no parseable `consts.actionMetadata`.
   */
  private toEntry(
    workflowId: string,
    definition: ActionWorkflowDefinition | null
  ): ActionCatalogEntry | undefined {
    const metadata = parseActionMetadata(
      workflowId,
      definition?.consts?.actionMetadata,
      this.logger
    );
    if (!metadata) {
      return undefined;
    }
    const { name, description, category, impact, approvalPolicy, subject } = metadata;
    const inputSchema = this.readInputSchema(definition);
    const subjects = subject === undefined || Array.isArray(subject) ? subject : [subject];
    return {
      workflowId,
      name,
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(impact !== undefined && { impact }),
      approvalPolicy,
      ...(subjects !== undefined && { subjects }),
      ...(inputSchema !== undefined && { inputSchema }),
    };
  }

  /**
   * Reads the JSON Schema the workflow declares on its manual trigger
   * (`triggers[type=manual].inputs`) and returns it verbatim. The trigger is
   * parsed with the workflow's own {@link ManualTriggerSchema}: definitions are
   * validated and normalized by the workflow schema on the way in, and this
   * guards the defensive path where an unnormalized or stale definition still
   * carries legacy array-format inputs or a malformed schema — anything that
   * does not parse yields `undefined` and the entry is returned without
   * `inputSchema`, so a malformed schema is never published.
   */
  private readInputSchema(definition: ActionWorkflowDefinition | null): JsonSchema | undefined {
    const manualTrigger = definition?.triggers?.find((t) => t.type === 'manual');
    if (!manualTrigger) {
      return undefined;
    }
    // Parse as a gate only: a successful parse means `inputs` is a well-formed
    // JSON Schema (or the legacy array format), but the parsed copy strips
    // unknown keys — the entry publishes the original value, verbatim.
    if (!ManualTriggerSchema.safeParse(manualTrigger).success) {
      return undefined;
    }
    const { inputs } = manualTrigger;
    return Array.isArray(inputs) ? undefined : (inputs as JsonSchema);
  }
}
