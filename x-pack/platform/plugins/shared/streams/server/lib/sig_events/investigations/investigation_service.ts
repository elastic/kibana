/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { InvestigationInput, SigEvent } from '@kbn/streams-schema';
import { STREAMS_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

const STREAMS_PLUGIN_ID = 'streams';

export class InvestigationService {
  constructor(
    private readonly workflowsExtensions: WorkflowsExtensionsServerPluginStart,
    private readonly logger: Logger
  ) {}

  async triggerForEvent({
    event,
    request,
    space,
  }: {
    event: SigEvent;
    request: KibanaRequest;
    space: string;
  }): Promise<void> {
    if (!event.discovery_id) {
      return;
    }

    const inputs: InvestigationInput = {
      event_id: event.event_id,
      discovery_id: event.discovery_id,
      discovery_slug: event.discovery_slug,
      title: event.title,
      summary: event.summary,
      root_cause: event.root_cause,
      impact: event.impact,
      stream_names: event.stream_names,
      cause_kis: event.cause_kis ?? [],
      evidences: event.evidences ?? [],
    };

    await this.execute({ inputs, request, space });
  }

  async triggerWithInputs({
    inputs,
    request,
    space,
  }: {
    inputs: InvestigationInput;
    request: KibanaRequest;
    space: string;
  }): Promise<void> {
    await this.execute({ inputs, request, space });
  }

  private async execute({
    inputs,
    request,
    space,
  }: {
    inputs: InvestigationInput;
    request: KibanaRequest;
    space: string;
  }): Promise<void> {
    let workflowsClient;
    try {
      workflowsClient = await this.workflowsExtensions.getClient(request);
    } catch (err) {
      this.logger.warn(`Investigation trigger: failed to get workflows client: ${err}`);
      return;
    }

    if (!workflowsClient.isWorkflowsAvailable) {
      return;
    }

    try {
      await workflowsClient.managedWorkflows.execute(
        STREAMS_PLUGIN_ID,
        STREAMS_INVESTIGATION_WORKFLOW_ID,
        { spaceId: space, inputs }
      );
    } catch (err) {
      this.logger.warn(
        `Investigation trigger: failed to execute workflow for event ${inputs.event_id}: ${err}`
      );
    }
  }
}
