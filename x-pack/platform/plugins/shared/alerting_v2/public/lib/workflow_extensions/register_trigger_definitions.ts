/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PublicTriggerDefinition,
  WorkflowsExtensionsPublicPluginSetup,
} from '@kbn/workflows-extensions/public';
import { episodeAssignedTriggerPublicDefinition } from './triggers/episode_assigned';
import { episodeUnassignedTriggerPublicDefinition } from './triggers/episode_unassigned';
import { episodeAckedTriggerPublicDefinition } from './triggers/episode_acked';
import { episodeUnackedTriggerPublicDefinition } from './triggers/episode_unacked';
import { episodeTaggedTriggerPublicDefinition } from './triggers/episode_tagged';
import { episodeSnoozedTriggerPublicDefinition } from './triggers/episode_snoozed';
import { episodeUnsnoozedTriggerPublicDefinition } from './triggers/episode_unsnoozed';
import { episodeActivatedTriggerPublicDefinition } from './triggers/episode_activated';
import { episodeDeactivatedTriggerPublicDefinition } from './triggers/episode_deactivated';

const triggerDefinitions: PublicTriggerDefinition[] = [
  episodeAssignedTriggerPublicDefinition,
  episodeUnassignedTriggerPublicDefinition,
  episodeAckedTriggerPublicDefinition,
  episodeUnackedTriggerPublicDefinition,
  episodeTaggedTriggerPublicDefinition,
  episodeSnoozedTriggerPublicDefinition,
  episodeUnsnoozedTriggerPublicDefinition,
  episodeActivatedTriggerPublicDefinition,
  episodeDeactivatedTriggerPublicDefinition,
];

/**
 * Registers all alerting-v2 public workflow trigger definitions (UI metadata).
 * Call once during plugin setup with the `workflowsExtensions` setup contract.
 */
export function registerTriggerDefinitions(
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void {
  for (const definition of triggerDefinitions) {
    workflowsExtensions.registerTriggerDefinition(definition);
  }
}
