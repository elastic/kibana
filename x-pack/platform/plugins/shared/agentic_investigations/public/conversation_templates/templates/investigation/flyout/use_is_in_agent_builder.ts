/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AGENTBUILDER_APP_ID } from '@kbn/agent-builder-plugin/public';

/** Whether the investigation flyout is open in the Agent Builder app, next to the chat. */
export const useIsInAgentBuilder = (): boolean => {
  const { services } = useKibana<Partial<CoreStart>>();
  const currentAppId$ = services?.application?.currentAppId$;
  const appId = useObservable(
    useMemo(() => currentAppId$ ?? of(undefined), [currentAppId$]),
    undefined
  );
  return appId === AGENTBUILDER_APP_ID;
};
