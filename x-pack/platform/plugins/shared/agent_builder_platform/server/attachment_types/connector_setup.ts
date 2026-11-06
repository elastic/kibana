/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AgentsStart } from '@kbn/agent-builder-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { getConnectorSpec } from '@kbn/connector-specs';
import {
  CONNECTOR_SETUP_ATTACHMENT_TYPE,
  connectorSetupAttachmentDataSchema,
  type ConnectorSetupAttachmentData,
} from '../../common/attachments';
import { isChatCallableConnectorType } from '../skills/connector_authoring/utils';

interface ConnectorSetupAttachmentTypeDeps {
  getAgentsStart: () => Promise<AgentsStart>;
  getActionsStart: () => Promise<ActionsPluginStart>;
  logger: Logger;
}

/**
 * Server-side definition for the `connector_setup` attachment type.
 *
 * When the card records the created connector as its origin, the connector is added to the
 * conversation's agent so the agent can call it.
 */
export const createConnectorSetupAttachmentType = ({
  getAgentsStart,
  getActionsStart,
  logger,
}: ConnectorSetupAttachmentTypeDeps): AttachmentTypeDefinition<
  typeof CONNECTOR_SETUP_ATTACHMENT_TYPE,
  ConnectorSetupAttachmentData
> => ({
  id: CONNECTOR_SETUP_ATTACHMENT_TYPE,
  isReadonly: true,
  onOriginUpdated: async (attachment, { request, agentId, canManageAgents }) => {
    if (!canManageAgents) {
      throw new Error(
        'The connector was created, but adding it to this agent requires the "Create and edit agents" privilege.'
      );
    }
    const connectorId = attachment.origin;
    // The origin is client-supplied: confirm the connector exists, is visible to the user, and
    // use its real type. The agent can't call types without a spec (they only work in Workflows).
    const actionsClient = await (await getActionsStart()).getActionsClientWithRequest(request);
    const { actionTypeId } = await actionsClient.get({ id: connectorId });
    if (!isChatCallableConnectorType(actionTypeId)) {
      return;
    }
    const agentsStart = await getAgentsStart();
    const registry = await agentsStart.getRegistry({ request });
    const agent = await registry.get(agentId);
    const currentIds = agent.configuration.connector_ids ?? [];
    if (currentIds.includes(connectorId)) {
      return;
    }
    await registry.update(agentId, {
      configuration: { connector_ids: [...currentIds, connectorId] },
    });
    logger.debug(`Added connector ${connectorId} to agent ${agentId}`);
  },
  validate: (input) => {
    const parsed = connectorSetupAttachmentDataSchema.safeParse(input);
    if (parsed.success) {
      return { valid: true, data: parsed.data };
    }
    return {
      valid: false,
      error: parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; '),
    };
  },
  format: (attachment) => {
    return {
      getRepresentation: () => {
        const { connector_type: connectorType, connector_type_name: connectorTypeName } =
          attachment.data;
        const spec = getConnectorSpec(connectorType);
        const displayName = connectorTypeName ?? spec?.metadata.displayName ?? connectorType;
        const value = [
          `Connector setup card shown to the user for: ${displayName} (${connectorType}).`,
          'The user enters configuration and secrets in the connector form; those never appear in chat.',
          'Once the user creates the connector it is added to this agent automatically, if they have permission to edit agents — you do not need to ask for the connector id.',
          'After the user confirms it is set up, proceed using the connector tools on a later turn.',
        ].join('\n');
        return { type: 'text', value };
      },
    };
  },
  getAgentDescription: () => {
    return `A \`connector_setup\` attachment is an inline card that lets the user create a connector instance without leaving chat. Render it by emitting <render_attachment id="ATTACHMENT_ID" /> using only ids returned by the \`propose_connector\` tool. Do not ask the user for secrets in chat — they enter them in the card's form. After the user creates the connector, it is picked up automatically; continue on a later turn.`;
  },
});
