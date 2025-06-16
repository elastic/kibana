/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from './use_kibana';

export interface StreamsFeatures {
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
    },
    dependencies: {
      start: {
        licensing,
        streams: { config$ },
      },
    },
  } = useKibana();

  const license = useObservable(licensing.license$);
  const streamsConfig = useObservable(config$);

  return {
    ui: streams as {
      [STREAMS_UI_PRIVILEGES.manage]: boolean;
      [STREAMS_UI_PRIVILEGES.show]: boolean;
    },
    features: {
      significantEvents:
        license && streamsConfig
          ? {
              enabled: !!streamsConfig.experimental?.significantEventsEnabled,
              available:
                !!streamsConfig.experimental?.significantEventsEnabled &&
                license.hasAtLeast('enterprise'),
            }
          : undefined,
    },
  };
}
