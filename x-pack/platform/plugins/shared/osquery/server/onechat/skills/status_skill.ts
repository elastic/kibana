/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { Skill } from '@kbn/agent-builder-common/skills';
import type { GetOsqueryAppContextFn } from './utils';
import { getOneChatContext } from './utils';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { OSQUERY_INTEGRATION_NAME } from '../../../common/constants';
import { fetchOsqueryPackagePolicyIds } from '../../routes/utils';

const STATUS_SKILL: Omit<Skill, 'tools'> = {
  namespace: 'osquery.status',
  name: 'Osquery Status',
  description: 'Check osquery integration status and availability',
  content: `# Osquery Status Guide

This skill provides knowledge about checking osquery integration status.

## Overview
Status checks help determine if osquery is properly installed, configured, and available for use.

## Key Concepts

### Installation Status
- **installed**: Osquery package is installed
- **not_installed**: Osquery package is not installed

### Availability
- Check if osquery integration is available
- Verify package policies are configured
- Confirm agents have osquery enabled

## Usage Examples

### Check osquery status
\`\`\`
tool("get_status", {})
\`\`\`

## Best Practices
- Check status before running queries
- Verify installation if queries fail
- Monitor status for configuration changes
`,
};

/**
 * Creates a LangChain tool for checking osquery integration status.
 *
 * @param getOsqueryContext - Factory function that returns the OsqueryAppContext
 * @returns A LangChain tool configured for status checking
 * @internal
 */
const createGetStatusTool = (getOsqueryContext: GetOsqueryAppContextFn) => {
  return tool(
    async ({}, config) => {
      const onechatContext = getOneChatContext(config);
      if (!onechatContext) {
        throw new Error('OneChat context not available');
      }

      const osqueryContext = getOsqueryContext();
      if (!osqueryContext) {
        throw new Error('Osquery context not available');
      }

      const { request } = onechatContext;
      const [coreStart] = await osqueryContext.getStartServices();

      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
        osqueryContext,
        request
      );

      const packageService = osqueryContext.service.getPackageService()?.asInternalUser;
      const packageInfo = await packageService?.getInstallation(
        OSQUERY_INTEGRATION_NAME,
        spaceScopedClient
      );

      const osqueryPackagePolicyIdsWithinCurrentSpace = await fetchOsqueryPackagePolicyIds(
        spaceScopedClient,
        osqueryContext
      );

      if (!osqueryPackagePolicyIdsWithinCurrentSpace.length) {
        return JSON.stringify({
          install_status: 'not_installed',
          message: 'No osquery package policies found in current space',
        });
      }

      return JSON.stringify({
        install_status: packageInfo ? 'installed' : 'not_installed',
        package_info: packageInfo
          ? {
              name: packageInfo.name,
              version: packageInfo.version,
              install_version: packageInfo.install_version,
            }
          : null,
        package_policies_count: osqueryPackagePolicyIdsWithinCurrentSpace.length,
      });
    },
    {
      name: 'get_status',
      description: 'Get osquery integration installation and availability status',
      schema: z.object({}),
    }
  );
};

/**
 * Creates the Status skill for checking osquery integration availability.
 *
 * Use this skill to verify that osquery is properly installed and configured
 * before attempting to run queries. This is useful for troubleshooting and
 * providing user feedback about osquery availability.
 *
 * @param getOsqueryContext - Factory function that returns the OsqueryAppContext at runtime.
 *                            This allows lazy initialization and proper dependency injection.
 * @returns A Skill object containing the `get_status` tool.
 *
 * @example
 * ```typescript
 * const statusSkill = getStatusSkill(() => osqueryAppContext);
 *
 * // The skill exposes one tool:
 * // - get_status: Check osquery installation status (no parameters required)
 * ```
 *
 * @remarks
 * Status information includes:
 * - `install_status`: 'installed' or 'not_installed'
 * - `package_info`: Package name, version, and install version (if installed)
 * - `package_policies_count`: Number of osquery package policies in current space
 *
 * A status of 'not_installed' or zero package policies indicates that osquery
 * may not be available for running queries in the current space.
 *
 * @see {@link getLiveQuerySkill} for running queries when status is available
 */
export const getStatusSkill = (getOsqueryContext: GetOsqueryAppContextFn): Skill => {
  return {
    ...STATUS_SKILL,
    tools: [createGetStatusTool(getOsqueryContext)],
  };
};





