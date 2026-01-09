/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatPluginSetup } from '@kbn/onechat-plugin/server';
import { ML_ANOMALY_DETECTION_JOBS_SKILL } from './ml_anomaly_detection_jobs_skill';
import { ML_DATA_FRAME_ANALYTICS_SKILL } from './ml_data_frame_analytics_skill';

export const registerAgentBuilderSkills = (onechat: OnechatPluginSetup) => {
  onechat.skills.register(ML_ANOMALY_DETECTION_JOBS_SKILL);
  onechat.skills.register(ML_DATA_FRAME_ANALYTICS_SKILL);
};



