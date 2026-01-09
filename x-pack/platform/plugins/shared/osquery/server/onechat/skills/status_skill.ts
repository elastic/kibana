/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { Skill } from '@kbn/onechat-common/skills';
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

export const getStatusSkill = (getOsqueryContext: GetOsqueryAppContextFn): Skill => {
  return {
    ...STATUS_SKILL,
    tools: [createGetStatusTool(getOsqueryContext)],
  };
};





