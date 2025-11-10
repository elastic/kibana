/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ToolsSetup } from '@kbn/onechat-plugin/server';
import { attackDiscoveryTool } from './attack_discovery_tool';
import { detectionsSummaryTool } from './detections_summary_tool';
import { casesTool } from './cases_tool';
import { ruleChangesTool } from './rule_changes_tool';
import { securityCatchupTool } from './security_catchup_tool';
import { alertsByEntitiesTool } from './alerts_by_entities_tool';
import { fetchIncidentTool } from './fetch_incident_tool';

export function registerSecurityTools(toolsSetup: ToolsSetup, logger: Logger): void {
  logger.info('Registering Security CatchUp tools...');

  try {
    const tools = [
      attackDiscoveryTool(),
      detectionsSummaryTool(),
      casesTool(),
      ruleChangesTool(),
      securityCatchupTool(),
      alertsByEntitiesTool(),
      fetchIncidentTool(),
    ];

    for (const tool of tools) {
      logger.debug(`Registering tool: ${tool.id}`);
      toolsSetup.register(tool);
      logger.debug(`Tool ${tool.id} registered successfully`);
    }

    logger.info(`Registered ${tools.length} Security CatchUp tools`);
  } catch (error) {
    logger.error(`Error registering Security tools: ${error}`);
    throw error;
  }
}
