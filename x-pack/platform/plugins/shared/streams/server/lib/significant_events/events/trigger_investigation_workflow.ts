/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { STREAMS_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { agentBuilderDefaultAgentId, ConversationRoundStatus } from '@kbn/agent-builder-common';
import type { SignificantEvent } from '@kbn/streams-schema';
import { attachInvestigationToEvent } from './attach_investigation';
import type { EventClient } from './event_client';

const OBSERVABILITY_INVESTIGATION_TEMPLATE_ID = 'observability-investigation-v1';

const buildInvestigationConversationTitle = (event: SignificantEvent): string => {
  return `Investigation: ${event.title}`;
};

const buildInvestigationStartedMessage = (event: SignificantEvent): string => {
  return [
    'Investigation workflow started. Continue here with people and agents in the context of this significant event investigation.',
    `Event: ${event.title}`,
    `Summary: ${event.summary}`,
    `Probable cause: ${event.root_cause}`,
  ].join('\n\n');
};

const createInvestigationConversation = async ({
  agentBuilder,
  request,
  event,
  now,
}: {
  agentBuilder: AgentBuilderPluginStart;
  request: KibanaRequest;
  event: SignificantEvent;
  now: string;
}): Promise<string> => {
  const client = await agentBuilder.conversations.getScopedClient({ request });
  const conversation = await client.create({
    agent_id: agentBuilderDefaultAgentId,
    title: buildInvestigationConversationTitle(event),
    rounds: [],
    template_id: OBSERVABILITY_INVESTIGATION_TEMPLATE_ID,
    conversation_mode: 'group',
    status: ConversationRoundStatus.inProgress,
    custom_fields: {
      source: 'significant_event',
      status: 'running',
      current_state: 'Investigation workflow is running.',
      event_id: event.event_id,
      discovery_slug: event.discovery_slug,
      stream_names: event.stream_names,
      root_cause: event.root_cause,
      criticality: event.criticality,
      confidence: event.confidence,
      recommendations: event.recommendations,
      last_refreshed_at: now,
      timeline: [
        {
          at: now,
          actor: 'significant events',
          source: 'significant_events',
          summary: 'Investigation workflow started',
          metadata: {
            event_id: event.event_id,
            discovery_slug: event.discovery_slug,
          },
        },
      ],
    },
  });

  await client.appendMessage({
    conversationId: conversation.id,
    message: buildInvestigationStartedMessage(event),
  });

  return conversation.id;
};

/**
 * Runs the managed investigation workflow for the given significant event in the
 * caller's current space. Returns the execution id when started, or undefined when
 * workflows are unavailable or the managed workflow has not been installed yet.
 */
export const triggerInvestigationWorkflow = async ({
  workflowsManagement,
  agentBuilder,
  spaces,
  request,
  logger,
  eventClient,
  event,
}: {
  workflowsManagement?: WorkflowsServerPluginSetup;
  agentBuilder?: AgentBuilderPluginStart;
  spaces?: SpacesPluginStart;
  request: KibanaRequest;
  logger: Logger;
  eventClient: EventClient;
  event: SignificantEvent;
}): Promise<{ executionId: string; conversationId?: string } | undefined> => {
  if (!workflowsManagement) {
    logger.debug('Workflows management not available, skipping investigation trigger');
    return undefined;
  }
  if (!agentBuilder) {
    logger.debug('Agent Builder not available, skipping investigation trigger');
    return undefined;
  }

  const spaceId = spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
  const workflow = await workflowsManagement.management.getWorkflow(
    STREAMS_INVESTIGATION_WORKFLOW_ID,
    spaceId
  );

  if (!workflow || !workflow.definition) {
    logger.warn(
      `Managed workflow "${STREAMS_INVESTIGATION_WORKFLOW_ID}" not found, skipping investigation trigger`
    );
    return undefined;
  }

  const now = new Date().toISOString();
  const conversationId = await createInvestigationConversation({
    agentBuilder,
    request,
    event,
    now,
  });

  const {
    title,
    summary,
    root_cause,
    stream_names,
    event_id,
    discovery_slug,
    status,
    criticality,
    confidence,
    recommendations,
  } = event;

  const inputs = {
    message: `${title}\n\n${summary}\n\nProbable cause: ${root_cause}`,
    stream_names: stream_names ?? [],
    concurrency_key: discovery_slug,
    context: {
      source: 'significant_event',
      event_id,
      discovery_slug,
      status,
      criticality,
      confidence,
      root_cause,
      recommendations,
      conversation_id: conversationId,
    },
  };

  const executionId = await workflowsManagement.management.runWorkflow(
    { ...workflow, definition: workflow.definition },
    spaceId,
    inputs,
    request,
    'sigevents-investigation-ui'
  );

  try {
    const client = await agentBuilder.conversations.getScopedClient({ request });
    const conversation = await client.get(conversationId);
    await client.update({
      id: conversationId,
      custom_fields: {
        ...(conversation.custom_fields ?? {}),
        workflow_execution_id: executionId,
        last_refreshed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.debug(
      `Unable to stamp workflow execution id on conversation ${conversationId}: ${error}`
    );
  }

  await attachInvestigationToEvent({
    eventClient,
    eventId: event.event_id,
    investigation: {
      workflow_execution_id: executionId,
      status: 'pending',
      started_at: now,
      conversation_id: conversationId,
      current_state: 'Investigation workflow is running.',
    },
  });

  logger.info(
    `Triggered investigation workflow for event "${event_id}", executionId=${executionId}, conversationId=${conversationId}`
  );
  return { executionId, conversationId };
};
