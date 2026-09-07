/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { getConnectorSpec, isToolAction, isSystemCallableAction } from '@kbn/connector-specs';
import { formatSchemaForLlm } from '@kbn/agent-builder-server';
import type { AgentConnector } from './agent_connectors';
import { listAgentConnectors } from './agent_connectors';
import type { SandboxApiClient } from './grpc_client';
import type { SandboxCallContext } from './tool_utils';
import { HTTP_CONNECTOR_TYPE_ID, renderHttpConnectorSection } from './http_connector_adapter';

const renderElasticsearchSection = (): string => `## elasticsearch (synthetic — always available)

Queries the Elasticsearch cluster this Kibana is connected to, running as the current user.
Elasticsearch RBAC applies.

### esql
Run an ES|QL query. Returns an array of JSON objects.
Params: \`{"query": "FROM index | LIMIT 10", "limit": 100}\`

### resolve_index
List indices matching a wildcard. Params: \`{"pattern": "logs-*"}\`

### get_mapping
Return field types (field_caps). Params: \`{"pattern": "logs-*", "fields": "*"}\``;

const renderConnectorSection = (connector: AgentConnector): string => {
  if (connector.actionTypeId === HTTP_CONNECTOR_TYPE_ID) {
    return renderHttpConnectorSection(connector.name, connector.id);
  }

  const spec = getConnectorSpec(connector.actionTypeId);
  const lines: string[] = [
    `## ${connector.name} (connector-id: ${connector.id}, type: ${connector.actionTypeId})`,
  ];

  if (!spec) {
    lines.push(
      '',
      '*Sub-actions are not documented for this connector type. Probe with a test call to discover available sub-actions.*'
    );
    return lines.join('\n');
  }

  const toolActions = Object.entries(spec.actions ?? {}).filter(([name]) =>
    isToolAction(spec, name)
  );
  const systemActions = Object.entries(spec.actions ?? {}).filter(([name]) =>
    isSystemCallableAction(spec, name)
  );

  if (toolActions.length === 0) {
    lines.push('', '*No tool sub-actions available for this connector type.*');
  } else {
    for (const [name, action] of toolActions) {
      lines.push('', `### ${name}`);
      if (action.description) lines.push(action.description);
      if (action.scope) lines.push(`Scope: ${action.scope}`);
      try {
        const paramSchema = formatSchemaForLlm(action.input);
        if (paramSchema) lines.push(`Params schema: ${paramSchema}`);
      } catch {
        // formatSchemaForLlm may throw for complex schemas — skip gracefully
      }
    }
  }

  if (systemActions.length > 0) {
    lines.push(
      '',
      '### System sub-actions (server-side use only)',
      'These sub-actions return sensitive data and must not be passed directly to tools or stored in files.'
    );
    for (const [name] of systemActions) {
      if (name === 'getToken') {
        lines.push(
          '',
          `#### ${name}`,
          'Returns the raw Bearer token for this connector. Use it to authenticate git or other CLI tools:',
          '```bash',
          `TOKEN=$(sandbox-cb --connector-id ${connector.id} --sub-action getToken | jq -r '.token')`,
          `git clone "https://x-access-token:$TOKEN@github.com/org/repo"`,
          '```',
          'Never store or echo the token beyond the current shell command.'
        );
      } else {
        lines.push('', `#### ${name}`);
      }
    }
  }

  return lines.join('\n');
};

export const writeConnectorManifest = async ({
  conversationId,
  apiClient,
  callContext,
  getActionsClient,
  logger,
}: {
  conversationId: string;
  apiClient: SandboxApiClient;
  callContext: SandboxCallContext;
  getActionsClient: ((req: KibanaRequest) => Promise<any>) | undefined;
  logger: Logger;
}): Promise<void> => {
  const connectors = await listAgentConnectors(callContext, getActionsClient);

  const sections: string[] = [
    '# Sandbox Connectors',
    '',
    'Use `sandbox-cb` to call connectors from bash:',
    '```bash',
    'sandbox-cb --connector-id <id> --sub-action <name> --sub-action-params \'{"key":"value"}\'',
    '```',
    'Exit 0: JSON on stdout. Exit 1: error on stderr. Exit 2: transport error.',
    '',
    '---',
    '',
    renderElasticsearchSection(),
  ];

  if (connectors.length === 0) {
    sections.push('', '---', '', '*(No third-party connectors are assigned to this agent.)*');
  } else {
    for (const connector of connectors) {
      sections.push('', '---', '', renderConnectorSection(connector));
    }
  }

  const content = sections.join('\n') + '\n';

  logger.debug(
    `Writing connector manifest for conversation ${conversationId} (${connectors.length} connector(s))`
  );

  await apiClient.writeFiles(conversationId, [
    { path: '/workspace/connectors.md', content: Buffer.from(content, 'utf8') },
  ]);
};
