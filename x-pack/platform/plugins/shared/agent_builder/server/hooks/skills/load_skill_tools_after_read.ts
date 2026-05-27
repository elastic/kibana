/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AfterToolCallHookContext } from '@kbn/agent-builder-server';
import { internalTools } from '@kbn/agent-builder-common/tools';
import { loadSkillTools } from '../../services/skills/load_skill_tools';
import { isSkillFileEntry } from '../../services/execution/runner/store/volumes/skills/utils';
import type { AnalyticsService, TrackingService } from '../../telemetry';

export const createLoadSkillToolsAfterRead = ({
  analyticsService,
  trackingService,
}: { analyticsService?: AnalyticsService; trackingService?: TrackingService } = {}) => {
  return async (context: AfterToolCallHookContext): Promise<void> => {
    if (context.toolId !== internalTools.readFile) {
      return;
    }

    const { filestore, skills, toolProvider, toolManager, request, logger, runContext } =
      context.toolHandlerContext;

    const path = context.toolParams.path as string | undefined;
    if (!path) {
      return;
    }

    const entry = await filestore.read(path);
    if (!entry || !isSkillFileEntry(entry)) {
      return;
    }

    const { skill_id: skillId } = entry.metadata;

    const skill = await skills.get(skillId);
    if (!skill) {
      logger.warn(`Skill '${skillId}' not found in registry. Skipping tool loading.`);
      return;
    }

    await loadSkillTools({
      skill,
      skillsService: skills,
      toolProvider,
      request,
      toolManager,
      logger,
      runContext,
      analyticsService,
      trackingService,
    });
  };
};
