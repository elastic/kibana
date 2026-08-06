/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RunBudgetGroupId } from '@kbn/significant-events-plugin/common';

/** Shared so the Settings rows and the exhaustion banner name a group the same way. */
export const RUN_BUDGET_GROUP_LABELS: Record<RunBudgetGroupId, string> = {
  ki_extraction: i18n.translate(
    'xpack.significantEventsApp.settings.runLimits.group.kiExtraction',
    { defaultMessage: 'Knowledge indicator extraction' }
  ),
  memory: i18n.translate(
    'xpack.significantEventsApp.settings.runLimits.group.memory',
    { defaultMessage: 'Memory updates' }
  ),
  detection: i18n.translate(
    'xpack.significantEventsApp.settings.runLimits.group.detection',
    { defaultMessage: 'Discovery and significant event generation' }
  ),
  investigation: i18n.translate(
    'xpack.significantEventsApp.settings.runLimits.group.investigation',
    { defaultMessage: 'Investigations' }
  ),
};
