/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSetupServices } from '../services';
import { agentBuilderTracesSkill } from './agent_builder_traces_skill';

/**
 * Registers the built-in skills owned by the Agent Builder plugin itself.
 */
export const registerSkills = (serviceSetups: InternalSetupServices): void => {
  serviceSetups.skills.registerSkill(agentBuilderTracesSkill);
};
