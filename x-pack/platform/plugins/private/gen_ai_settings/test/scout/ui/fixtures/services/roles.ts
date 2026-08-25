/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

/**
 * Role definition for a user without Agent Builder privileges.
 * Has AI Assistants (Observability & Security) but no Agent Builder.
 */
export const getAgentBuilderNoneRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: ['all'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        securitySolutionAssistant: ['all'],
        observabilityAIAssistant: ['all'],
        actions: ['all'],
        advancedSettings: ['all'],
      },
      spaces: ['*'],
    },
  ],
});

/**
 * Role definition for a user without AI Assistants privileges.
 * Has Agent Builder but no AI Assistants (Observability & Security).
 */
export const getAIAssistantsNoneRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: ['all'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        agentBuilder: ['all'],
        actions: ['all'],
        advancedSettings: ['all'],
      },
      spaces: ['*'],
    },
  ],
});

/**
 * Role definition for a user with both AI Assistants and Agent Builder privileges.
 * Has full access to Observability AI Assistant, Security AI Assistant, and Agent Builder.
 */
export const getFullAIPrivilegesRole = (): KibanaRole => ({
  elasticsearch: {
    cluster: ['all'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        actions: ['all'],
        advancedSettings: ['all'],
        securitySolutionAssistant: ['all'],
        observabilityAIAssistant: ['all'],
        agentBuilder: ['all'],
      },
      spaces: ['*'],
    },
  ],
});
