/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';
import {
  AGENT_BUILDER_EVENT_TYPES,
  type ReportUiClickParams,
} from '@kbn/agent-builder-common/telemetry';

export function reportAgentBuilderUiClick(
  analytics: AnalyticsServiceStart,
  params: ReportUiClickParams
): void {
  analytics.reportEvent<ReportUiClickParams>(AGENT_BUILDER_EVENT_TYPES.UiClick, params);
}
