/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { CasesServerStartDependencies } from '../types';
import type { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';
import { searchCasesTool } from './tools/search_cases';
import { manageCasesTool } from './tools/manage_cases';
import { getAttachmentsTool } from './tools/get_attachments_tool';
import { manageAttachmentsTool } from './tools/manage_attachments_tool';
import { observablesTool } from './tools/observable_tools';
import { findTemplatesTool } from './tools/find_templates_tool';
import { buildCasesSkill } from './skills/cases_skill';
import { casesAnalyticsSkill } from './skills/cases_analytics_skill';
import { createCaseAttachmentType } from './attachments/case_attachment_type';
import { createCasesAttachmentType } from './attachments/cases_attachment_type';
import { createCasesToolAvailability } from './utils/get_cases_tool_availability';
import { tasksTool } from './tools/tasks_tool';
import { confirmedActionsTool } from './tools/confirmed_actions_tool';
import type { GetCasesClientWithOptionsFn } from './utils/agent_cases_client';

/**
 * Registers all Cases agent builder tools:
 *
 * 1. `platform.core.cases` — read/search (get by ID, bulk get, find similar, by alert IDs, search/filter)
 * 2. `platform.core.cases.manage` — create, update, delete, assign, unassign, add tags, set custom field
 * 3. `platform.core.cases.get_attachments` — get all attachments (read-only)
 * 4. `platform.core.cases.manage_attachments` — add comment/alerts/events/attachments (write)
 * 5. `platform.core.cases.observables` — add, update, delete observables
 * 6. `platform.core.cases.find_templates` — read-only, only when templates are enabled: look up
 *    case templates by name to resolve a `case_template_id`
 * 7. `platform.core.cases.tasks` — task lists and tasks (read, write, work, run a task's workflow),
 *    only when tasks are enabled
 * 8. `platform.core.cases.confirmed_actions` — close, visibility, restricted assignees, sync, push;
 *    Agent Builder asks the user before each call. Only when agentic cases are enabled.
 *
 * Also registers the `cases-management` skill, and — only when Cases-as-Data v2
 * is enabled — the `cases-analytics` skill (ES|QL analytics + visualizations over
 * the `.cases*` analytics indices). The analytics skill is gated on
 * `analyticsV2Enabled` because its indices don't exist otherwise.
 */
export function registerCasesAgentBuilderTools(
  agentBuilder: AgentBuilderPluginSetup,
  getCasesClient: GetCasesClientWithOptionsFn,
  coreSetup: CoreSetup<CasesServerStartDependencies>,
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry,
  {
    analyticsV2Enabled,
    attachmentsEnabled,
    templatesEnabled,
    tasksEnabled = false,
    agenticEnabled = false,
  }: {
    analyticsV2Enabled: boolean;
    attachmentsEnabled: boolean;
    templatesEnabled: boolean;
    /** Task lists are on (`xpack.cases.tasks.enabled`): registers the tasks tool. */
    tasksEnabled?: boolean;
    /** Agentic cases are on: registers the confirmed actions tool. */
    agenticEnabled?: boolean;
  },
  logger: Logger
): void {
  const availability = createCasesToolAvailability(coreSetup, logger);
  agentBuilder.tools.register({
    ...searchCasesTool(coreSetup, getCasesClient, agenticEnabled),
    availability,
  });
  agentBuilder.tools.register({
    ...manageCasesTool(getCasesClient, templatesEnabled, agenticEnabled),
    availability,
  });
  agentBuilder.tools.register({ ...getAttachmentsTool(getCasesClient), availability });
  agentBuilder.tools.register({
    ...manageAttachmentsTool(getCasesClient, unifiedAttachmentTypeRegistry, attachmentsEnabled),
    availability,
  });
  agentBuilder.tools.register({ ...observablesTool(getCasesClient), availability });
  // Only useful once templates are v2 saved objects that support name-based search; the legacy
  // per-space configuration templates have no such lookup.
  if (templatesEnabled) {
    agentBuilder.tools.register({ ...findTemplatesTool(getCasesClient), availability });
  }
  // Tasks tool only with agentic cases on too, so flags off leaves main's tool list unchanged.
  if (tasksEnabled && agenticEnabled) {
    agentBuilder.tools.register({ ...tasksTool(getCasesClient), availability });
  }
  if (agenticEnabled) {
    agentBuilder.tools.register({ ...confirmedActionsTool(getCasesClient), availability });
  }
  agentBuilder.skills.register({
    ...buildCasesSkill(templatesEnabled, {
      tasksEnabled: tasksEnabled && agenticEnabled,
      agenticEnabled,
    }),
    availability,
  });
  // Only expose the analytics skill when the analytics indices exist.
  if (analyticsV2Enabled) {
    agentBuilder.skills.register({ ...casesAnalyticsSkill, availability });
  }
  agentBuilder.attachments.registerType(
    createCaseAttachmentType() as Parameters<typeof agentBuilder.attachments.registerType>[0]
  );
  agentBuilder.attachments.registerType(
    createCasesAttachmentType() as Parameters<typeof agentBuilder.attachments.registerType>[0]
  );
}
