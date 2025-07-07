/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import {
  OBSERVABILITY_ENABLE_STREAMS_UI,
  OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS,
} from '@kbn/management-settings-ids';
import { useKibana } from './use_kibana';

export interface StreamsFeatures {
  ui?: {
    enabled: boolean;
  };
  significantEvents?: {
    available: boolean;
    enabled: boolean;
  };
}

export interface StreamsPrivileges {
  ui: {
    manage: boolean;
    show: boolean;
  };
  features: StreamsFeatures;
}

export function useStreamsPrivileges(): StreamsPrivileges {
  const {
    core: {
      application: {
        capabilities: { streams },
      },
      uiSettings,
    },
    dependencies: {
      start: { licensing },
    },
  } = useKibana();

  const license = useObservable(licensing.license$);

  const uiEnabled = uiSettings.get<boolean>(OBSERVABILITY_ENABLE_STREAMS_UI);

  const significantEventsEnabled = uiSettings.get<boolean>(
    OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS
  );

  return {
    ui: streams as {
      [STREAMS_UI_PRIVILEGES.manage]: boolean;
      [STREAMS_UI_PRIVILEGES.show]: boolean;
    },
    features: {
      ui: {
        enabled: uiEnabled,
      },
      significantEvents: license && {
        enabled: significantEventsEnabled,
        available: significantEventsEnabled && license.hasAtLeast('enterprise'),
      },
    },
  };
}
