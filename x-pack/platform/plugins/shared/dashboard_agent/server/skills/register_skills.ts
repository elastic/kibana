/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAgentSetupDependencies } from '../types';
import { PLATFORM_DASHBOARD_SKILL } from './platform_dashboards_skill';

export const registerSkills = (setupDeps: DashboardAgentSetupDependencies) => {
    setupDeps.onechat.skills.register(PLATFORM_DASHBOARD_SKILL);
};



