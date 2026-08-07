/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from './use_kibana';

export type SignificantEventsPrivileges = ReturnType<typeof useSignificantEventsPrivileges>;

export function useSignificantEventsPrivileges() {
  const {
    core: {
      application: {
        capabilities: { streams },
      },
    },
    services: { availability$ },
  } = useKibana();

  // The composite gate (rollout flag × Enterprise license × pricing tier) is computed
  // once in the plugin's start() and multicast through the services context — every
  // feature-flag evaluation POSTs a usage counter, so components must not recreate
  // the observable.
  const significantEventsAvailable = useObservable(availability$);

  return {
    /**
     * Streams UI capabilities: the Significant Events UI manages queries attached to
     * streams, so write actions are gated by the streams `manage` privilege.
     */
    ui: streams as {
      [STREAMS_UI_PRIVILEGES.manage]: boolean;
      [STREAMS_UI_PRIVILEGES.show]: boolean;
    },
    significantEvents: {
      available: significantEventsAvailable ?? false,
    },
    isLoading: significantEventsAvailable === undefined,
  };
}
