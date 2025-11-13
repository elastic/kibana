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
  try {
    toolsSetup.register(attackDiscoveryTool());
    toolsSetup.register(detectionsSummaryTool());
    toolsSetup.register(casesTool());
    toolsSetup.register(ruleChangesTool());
    toolsSetup.register(securityCatchupTool());
    toolsSetup.register(alertsByEntitiesTool());
    toolsSetup.register(fetchIncidentTool());
  } catch (error) {
    logger.error(`Error registering Security tools: ${error}`);
    throw error;
  }
}
