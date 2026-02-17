/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AGENTBUILDER_FEATURE_ID, uiPrivileges } from '../../../common/features';

type AgentBuilderUiPrivileges = {
  [K in keyof typeof uiPrivileges]: boolean;
};

export const useUiPrivileges = (): AgentBuilderUiPrivileges => {
  const {
    services: { application },
  } = useKibana();

  const agentBuilderCapabilities = useMemo(() => {
    const capabilities = application?.capabilities?.[AGENTBUILDER_FEATURE_ID] ?? {};

    return Object.keys(uiPrivileges).reduce((acc, key) => {
      const privilegeKey = key as keyof typeof uiPrivileges;
      acc[privilegeKey] = !!capabilities[uiPrivileges[privilegeKey]];
      return acc;
    }, {} as AgentBuilderUiPrivileges);
  }, [application]);

  return agentBuilderCapabilities;
};
