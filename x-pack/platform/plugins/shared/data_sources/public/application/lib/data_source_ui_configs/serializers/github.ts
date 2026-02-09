/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializerFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type {
  ConnectorFormSchema,
  InternalConnectorForm,
} from '@kbn/alerts-ui-shared/src/common/types';
import { GITHUB_MCP_SERVER_URL, MCP_AUTH_TYPE } from '../../../../../common';

/**
 * GitHub-specific config shape for MCP connector.
 * All properties are optional to allow safe casting from Record<string, unknown>.
 */
interface GitHubMCPConfig {
  serverUrl?: string;
  hasAuth?: boolean;
  authType?: string;
}

/**
 * GitHub-specific secrets shape.
 * All properties are optional to allow safe casting from Record<string, unknown>.
 */
interface GitHubSecrets {
  token?: string;
}

/**
 * Serializer: GitHub UI form → MCP connector format
 *
 * Converts the simplified GitHub form data into the full MCP connector
 * structure expected by the backend.
 *
 * @returns Serializer function for form submission
 */
export const createGitHubToMcpSerializer = (): SerializerFunc<
  ConnectorFormSchema,
  InternalConnectorForm
> => {
  return (formData): InternalConnectorForm => {
    // Cast to our expected shape for internal type safety
    const config = formData.config as GitHubMCPConfig | undefined;
    const secrets = formData.secrets as GitHubSecrets | undefined;

    // Only include token if it has a value (non-empty string)
    const token = secrets?.token?.trim();
    const serializedSecrets = token ? { token } : {};

    return {
      ...formData,
      actionTypeId: '.mcp',
      config: {
        serverUrl: config?.serverUrl || GITHUB_MCP_SERVER_URL,
        hasAuth: config?.hasAuth ?? true,
        authType: config?.authType || MCP_AUTH_TYPE,
      },
      secrets: serializedSecrets,
    };
  };
};

/**
 * Deserializer: MCP connector → GitHub UI form
 *
 * Loads an MCP connector and presents it in the GitHub UI format.
 *
 * @returns Deserializer function for form initialization
 */
export const createMcpToGitHubDeserializer = (): SerializerFunc<
  InternalConnectorForm,
  ConnectorFormSchema
> => {
  return (connector): ConnectorFormSchema => {
    // Cast to our expected shape for internal type safety
    const config = connector.config as GitHubMCPConfig | undefined;

    return {
      ...connector,
      config: {
        serverUrl: config?.serverUrl || GITHUB_MCP_SERVER_URL,
        hasAuth: config?.hasAuth ?? true,
        authType: config?.authType || MCP_AUTH_TYPE,
      },
      secrets: {
        // Always empty in edit mode - secrets are write-only
        token: '',
      },
    };
  };
};
