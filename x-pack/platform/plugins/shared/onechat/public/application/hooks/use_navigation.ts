/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { ONECHAT_APP_ID } from '../../../common/features';
import { useKibana } from './use_kibana';

export interface LocationState {
  shouldStickToBottom?: boolean;
  initialMessage?: string;
}

export const useNavigation = () => {
  const {
    services: { application },
  } = useKibana();

  const navigateToOnechatUrl = useCallback(
    (path: string, params?: Record<string, string>, state?: LocationState) => {
      const queryParams = new URLSearchParams(params);
      application.navigateToApp(ONECHAT_APP_ID, {
        path: queryParams.size ? `${path}?${queryParams}` : path,
        state,
      });
    },
    [application]
  );

  const createOnechatUrl = useCallback(
    (path: string, params?: Record<string, string>) => {
      const queryParams = new URLSearchParams(params);
      return application.getUrlForApp(ONECHAT_APP_ID, {
        path: queryParams.size ? `${path}?${queryParams}` : path,
      });
    },
    [application]
  );

  const navigateToManageConnectors = useCallback(
    () =>
      application.navigateToApp('management', {
        path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
      }),
    [application]
  );

  return {
    createOnechatUrl,
    navigateToOnechatUrl,
    navigateToManageConnectors,
  };
};
