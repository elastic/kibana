/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, internalTools } from '@kbn/agent-builder-common';
import { AttachmentType, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { ConnectorAttachmentData } from '@kbn/agent-builder-common/attachments';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import { createOtherResult } from '@kbn/agent-builder-server';
import type { OpencodeSubagentExecutor } from '../../opencode_subagent/executor';

const schema = z.object({});

const description = `List connector-owned CLI credentials available to the coding sandbox.

Use this before calling run_opencode_subagent when the user asks for git/gh,
gcloud, or another external CLI and the relevant connector is not obvious.

Return the connector choices to the user by name and description, then ask which
one to use. Once chosen, call run_opencode_subagent with credentials.cli using
the selected connectorId and the connector-defined mint input.`;

export const createListSandboxCliConnectorsTool = ({
  executor,
}: {
  executor: OpencodeSubagentExecutor;
}): BuiltinToolDefinition<typeof schema> => ({
  id: internalTools.listSandboxCliConnectors,
  description,
  type: ToolType.builtin,
  schema,
  tags: ['subagent', 'coding', 'credentials'],
  handler: async (_params, { request, attachments }) => {
    const allowedConnectors = attachments
      .getActive()
      .filter((attachment) => attachment.type === AttachmentType.connector)
      .map((attachment) => {
        const data = getLatestVersion(attachment)?.data as ConnectorAttachmentData | undefined;
        return data?.connector_id;
      })
      .filter((connectorId): connectorId is string => Boolean(connectorId));

    const connectors = await executor.listSandboxCliConnectors({
      request,
      allowedConnectors: allowedConnectors.length > 0 ? allowedConnectors : undefined,
    });

    return {
      results: [
        createOtherResult({
          sandbox_cli_connectors: connectors,
        }),
      ],
    };
  },
});
