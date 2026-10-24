/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AfterToolCallHookContext, HookHandlerResult } from '@kbn/agent-builder-server';
import { createOtherResult, type HookLifecycle } from '@kbn/agent-builder-server';
import { internalTools } from '@kbn/agent-builder-common/tools';
import { loadSkillTools } from '../../services/skills/load_skill_tools';
import { isSkillFileEntry } from '../../services/execution/runner/store/volumes/skills/utils';
import { MOUNT_POINTS } from '../../services/execution/filesystem/mount_points';
import type { AnalyticsService, TrackingService } from '../../telemetry';

export const createLoadSkillToolsAfterRead = ({
  analyticsService,
  trackingService,
}: { analyticsService?: AnalyticsService; trackingService?: TrackingService } = {}) => {
  return async (
    context: AfterToolCallHookContext
  ): Promise<void | HookHandlerResult<HookLifecycle.afterToolCall>> => {
    if (context.toolId !== internalTools.readFile) {
      return;
    }

    const {
      skillsStore,
      skills,
      toolProvider,
      toolManager,
      request,
      logger,
      runContext,
      experimentalFeatures,
    } = context.toolHandlerContext;

    const path = context.toolParams.path as string | undefined;
    if (!path) {
      return;
    }

    const skillsMountPrefix = `${MOUNT_POINTS.skills}/`;
    if (!path.startsWith(skillsMountPrefix)) {
      return;
    }
    const relativePath = path.slice(MOUNT_POINTS.skills.length);

    const entry = await skillsStore.getEntry(relativePath);
    if (!entry || !isSkillFileEntry(entry)) {
      return;
    }

    const { skill_id: skillId } = entry.metadata;

    const skill = await skills.get(skillId);
    if (!skill) {
      logger.warn(`Skill '${skillId}' not found in registry. Skipping tool loading.`);
      return;
    }

    const { dynamicTools } = await loadSkillTools({
      skill,
      skillsService: skills,
      toolProvider,
      request,
      toolManager,
      logger,
      runContext,
      dynamicToolsEnabled: experimentalFeatures.dynamicTools,
      analyticsService,
      trackingService,
    });

    // Natively bound tools show up in the model's tool list on their own. Dynamic tools are
    // only reachable through their definitions, so append them to the file's content.
    const { results } = context.toolReturn;
    if (dynamicTools.length === 0 || !results) {
      return;
    }
    return {
      toolReturn: {
        ...context.toolReturn,
        results: [...results, createOtherResult({ dynamic_tools: dynamicTools })],
      },
    };
  };
};
