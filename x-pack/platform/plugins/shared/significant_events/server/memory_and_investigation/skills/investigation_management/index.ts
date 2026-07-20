/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { SIGNIFICANT_EVENTS_EVENT_INVESTIGATION_ATTACH_TOOL_ID } from '../../../agent_builder/tools/register_tools';
import type { SignificantEventsMaintenanceService } from '../../../lib/maintenance/maintenance_service';
import { createInvestigationStartTool } from '../../tools/investigation_start/tool';
import content from './skill.md.text';

export const STREAMS_INVESTIGATION_MANAGEMENT_SKILL_ID = 'streams-investigation-management';

export const createStreamsInvestigationManagementSkill = ({
  maintenanceService,
  getWorkflowApi,
  getSpaceId,
}: {
  maintenanceService: SignificantEventsMaintenanceService;
  getWorkflowApi: () => WorkflowsServerPluginSetup['management'] | undefined;
  getSpaceId: (request: KibanaRequest) => string;
}) =>
  defineSkillType({
    id: STREAMS_INVESTIGATION_MANAGEMENT_SKILL_ID,
    name: STREAMS_INVESTIGATION_MANAGEMENT_SKILL_ID,
    basePath: 'skills/platform/streams',
    description:
      'Streams investigation management: trigger a root-cause analysis workflow for an observability issue, significant event, or alert; check the status of a running investigation; and summarise the structured findings once complete. Load when the user asks to investigate an incident, error, or anomaly — including a significant event attached to the conversation or a fired alert — optionally scoped to specific data streams.',
    content,
    experimental: true,
    getInlineTools: () => [
      createInvestigationStartTool({ maintenanceService, getWorkflowApi, getSpaceId }),
    ],
    getRegistryTools: () => [
      // Used when investigation_start returns before completion: the tool waits up to ~120s and
      // longer investigations (which are common) return still-running and need a status follow-up.
      platformCoreTools.getWorkflowExecutionStatus,
      // ES|QL tools for the alerts-as-data fallback when no solution alert tool is available.
      // Already part of the default agent, but listed here so the skill is self-contained
      // on custom agents.
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
      // Records the completed investigation back onto the significant event so the UI can
      // surface investigation history and link to the full RCA result.
      SIGNIFICANT_EVENTS_EVENT_INVESTIGATION_ATTACH_TOOL_ID,
    ],
  });
