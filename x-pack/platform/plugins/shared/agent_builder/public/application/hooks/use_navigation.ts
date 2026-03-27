/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { AGENTBUILDER_APP_ID } from '../../../common/features';
import { useKibana } from './use_kibana';

export interface LocationState {
  shouldStickToBottom?: boolean;
  initialMessage?: string;
}

export const MANAGEMENT_APP_ID = 'management';
const manageConnectorsPath = '/insightsAndAlerting/triggersActionsConnectors/connectors';

export const useNavigation = () => {
  const {
    services: { application },
  } = useKibana();

  const navigateToAgentBuilderUrl = useCallback(
    (path: string, params?: Record<string, string>, state?: LocationState) => {
      const queryParams = new URLSearchParams(params);
      application.navigateToApp(AGENTBUILDER_APP_ID, {
        path: queryParams.size ? `${path}?${queryParams}` : path,
        state,
      });
    },
    [application]
  );

  const createAgentBuilderUrl = useCallback(
    (path: string, params?: Record<string, string>) => {
      const queryParams = new URLSearchParams(params);
      return application.getUrlForApp(AGENTBUILDER_APP_ID, {
        path: queryParams.size ? `${path}?${queryParams}` : path,
      });
    },
    [application]
  );

  const navigateToManageConnectors = useCallback(
    () => application.navigateToApp(MANAGEMENT_APP_ID, { path: manageConnectorsPath }),
    [application]
  );

  const manageConnectorsUrl = useMemo(
    () =>
      application.getUrlForApp(MANAGEMENT_APP_ID, {
        path: manageConnectorsPath,
      }),
    [application]
  );

  return {
    createAgentBuilderUrl,
    navigateToAgentBuilderUrl,
    navigateToManageConnectors,
    manageConnectorsUrl,
  };
};
