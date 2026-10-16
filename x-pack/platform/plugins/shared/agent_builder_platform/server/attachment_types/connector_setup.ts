/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { getConnectorSpec } from '@kbn/connector-specs';
import {
  CONNECTOR_SETUP_ATTACHMENT_TYPE,
  connectorSetupAttachmentDataSchema,
  type ConnectorSetupAttachmentData,
} from '../../common/attachments';

/** The connector type's name, from the attachment, its spec, or its id. */
const getConnectorDisplayName = ({
  connector_type: connectorType,
  connector_type_name: connectorTypeName,
}: ConnectorSetupAttachmentData): string =>
  connectorTypeName ?? getConnectorSpec(connectorType)?.metadata.displayName ?? connectorType;

/**
 * Server-side definition for the `connector_setup` attachment type.
 */
export const createConnectorSetupAttachmentType = (): AttachmentTypeDefinition<
  typeof CONNECTOR_SETUP_ATTACHMENT_TYPE,
  ConnectorSetupAttachmentData
> => ({
  id: CONNECTOR_SETUP_ATTACHMENT_TYPE,
  isReadonly: true,
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
        const { data } = attachment;
        const displayName = getConnectorDisplayName(data);
        const value = [
          `Connector setup card shown to the user for: ${displayName} (${data.connector_type}).`,
          'The user enters configuration and secrets in the connector form; those never appear in chat.',
          'Once the user creates the connector it becomes available automatically — you do not need to ask for the connector id.',
          'After the user confirms it is set up, proceed using the connector tools on a later turn.',
        ].join('\n');
        return { type: 'text', value };
      },
    };
  },
  toSurfaceComposition: ({ data, origin }) => {
    const displayName = getConnectorDisplayName(data);

    const text = [
      data.reason ?? `Configure the ${displayName} connector so the agent can use it here.`,
      !origin && 'Finish setting it up in Kibana.',
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      type: 'view',
      title: displayName,
      subtitle: origin ? 'Connected' : 'Setup',
      body: [{ type: 'markdown', text }],
    };
  },
  getAgentDescription: () => {
    return `A \`connector_setup\` attachment is an inline card that lets the user create a connector instance without leaving chat. Render it by emitting <render_attachment id="ATTACHMENT_ID" /> using only ids returned by the \`propose_connector\` tool. Do not ask the user for secrets in chat — they enter them in the card's form. After the user creates the connector, it is picked up automatically; continue on a later turn.`;
  },
});
