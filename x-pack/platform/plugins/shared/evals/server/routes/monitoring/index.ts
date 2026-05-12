/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EvalsRouter } from '../../types';
import type { EvaluatorRegistry } from '../../lib/evaluation_engine';
import type { SkillMonitoringService } from '../../lib/monitoring/skill_monitoring_service';
import { registerGetSkillMetricsRoute } from './get_skill_metrics';
import { registerDetectDriftRoute } from './detect_drift';
import { registerReEvaluateSkillRoute } from './reevaluate_skill';
import { registerGetSkillAlertsRoute } from './get_skill_alerts';
import { registerAcknowledgeAlertRoute } from './acknowledge_alert';

export interface MonitoringRouteDependencies {
  router: EvalsRouter;
  logger: Logger;
  evaluatorRegistry: EvaluatorRegistry;
  monitoringService: SkillMonitoringService;
}

export const registerMonitoringRoutes = (dependencies: MonitoringRouteDependencies) => {
  registerGetSkillMetricsRoute(dependencies);
  registerDetectDriftRoute(dependencies);
  registerReEvaluateSkillRoute(dependencies);
  registerGetSkillAlertsRoute(dependencies);
  registerAcknowledgeAlertRoute(dependencies);
};
