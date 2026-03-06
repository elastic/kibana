/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AGENTBUILDER_FEATURE_ID, uiPrivileges } from '../../../common/features';

/** UI-facing privileges for Agent Builder (feature-backed + phantom hasAgentVisibilityAccessOverride). */
export type AgentBuilderUiPrivileges = {
  [K in keyof typeof uiPrivileges]: boolean;
} & {
  /** Phantom capability: true only for wildcard roles (e.g. superuser). Resolved server-side. */
  hasAgentVisibilityAccessOverride: boolean;
};

export const useUiPrivileges = (): AgentBuilderUiPrivileges => {
  const {
    services: { application },
  } = useKibana();

  const agentBuilderCapabilities = useMemo((): AgentBuilderUiPrivileges => {
    const capabilities = application?.capabilities?.[AGENTBUILDER_FEATURE_ID] ?? {};

    const fromFeature = Object.keys(uiPrivileges).reduce((acc, key) => {
      const privilegeKey = key as keyof typeof uiPrivileges;
      acc[privilegeKey] = !!capabilities[uiPrivileges[privilegeKey]];
      return acc;
    }, {} as { [K in keyof typeof uiPrivileges]: boolean });

    return {
      ...fromFeature,
      hasAgentVisibilityAccessOverride: !!capabilities.hasAgentVisibilityAccessOverride,
    };
  }, [application]);

  return agentBuilderCapabilities;
};
