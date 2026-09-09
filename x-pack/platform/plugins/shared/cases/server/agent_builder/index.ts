/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { CasesClient } from '../client';
import type { CasesServerStartDependencies } from '../types';
import type { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';
import { searchCasesTool } from './tools/search_cases';
import { manageCasesTool } from './tools/manage_cases';
import { attachmentsTool } from './tools/attachment_tools';
import { getAttachmentsTool } from './tools/get_attachments_tool';
import { manageAttachmentsTool } from './tools/manage_attachments_tool';
import { observablesTool } from './tools/observable_tools';
import { buildCasesSkill } from './skills/cases_skill';
import { casesAnalyticsSkill } from './skills/cases_analytics_skill';
import { createCaseAttachmentType } from './attachments/case_attachment_type';
import { createCasesAttachmentType } from './attachments/cases_attachment_type';
import { createCasesToolAvailability } from './utils/get_cases_tool_availability';

/**
 * Registers all Cases agent builder tools:
 *
 * 1. `platform.core.cases` — read/search (get by ID, bulk get, find similar, by alert IDs, search/filter)
 * 2. `platform.core.cases.manage` — create, update, delete, assign, unassign, add tags, set custom field
 * 3. `platform.core.cases.get_attachments` — get all attachments (read-only)
 * 4. `platform.core.cases.manage_attachments` — add comment/alerts/events/attachments (write)
 * 5. `platform.core.cases.attachments` — DEPRECATED: combined read+write, retained for backward compatibility
 * 6. `platform.core.cases.observables` — add, update, delete observables
 *
 * Also registers the `cases-management` skill, and — only when Cases-as-Data v2
 * is enabled — the `cases-analytics` skill (ES|QL analytics + visualizations over
 * the `.cases*` analytics indices). The analytics skill is gated on
 * `analyticsV2Enabled` because its indices don't exist otherwise.
 */
export function registerCasesAgentBuilderTools(
  agentBuilder: AgentBuilderPluginSetup,
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>,
  coreSetup: CoreSetup<CasesServerStartDependencies>,
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry,
  {
    analyticsV2Enabled,
    attachmentsEnabled,
    templatesEnabled,
  }: { analyticsV2Enabled: boolean; attachmentsEnabled: boolean; templatesEnabled: boolean },
  logger: Logger
): void {
  const availability = createCasesToolAvailability(coreSetup, logger);
  agentBuilder.tools.register({
    ...searchCasesTool(coreSetup, getCasesClient),
    availability,
  });
  agentBuilder.tools.register({
    ...manageCasesTool(getCasesClient, templatesEnabled),
    availability,
  });
  agentBuilder.tools.register({ ...getAttachmentsTool(getCasesClient), availability });
  agentBuilder.tools.register({
    ...manageAttachmentsTool(getCasesClient, unifiedAttachmentTypeRegistry, attachmentsEnabled),
    availability,
  });
  agentBuilder.tools.register({
    ...attachmentsTool(getCasesClient, unifiedAttachmentTypeRegistry, attachmentsEnabled),
    availability,
  });
  agentBuilder.tools.register({ ...observablesTool(getCasesClient), availability });
  agentBuilder.skills.register({ ...buildCasesSkill(templatesEnabled), availability });
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
