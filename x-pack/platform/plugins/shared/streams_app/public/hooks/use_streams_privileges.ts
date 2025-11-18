/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS,
  OBSERVABILITY_STREAMS_ENABLE_GROUP_STREAMS,
  OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS,
  OBSERVABILITY_STREAMS_ENABLE_ATTACHMENTS,
  OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS,
} from '@kbn/management-settings-ids';
import { STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE } from '@kbn/streams-plugin/common';
import type { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from './use_kibana';

export interface StreamsFeatures {
  ui?: {
    enabled: boolean;
  };
  significantEvents?: {
    available: boolean;
    enabled: boolean;
  };
  groupStreams?: {
    enabled: boolean;
  };
  queryStreams?: {
    enabled: boolean;
  };
  contentPacks?: {
    enabled: boolean;
  };
  attachments?: {
    enabled: boolean;
  };
}

export interface StreamsPrivileges {
  ui: {
    manage: boolean;
    show: boolean;
  };
  features: StreamsFeatures;
  isLoading?: boolean;
}

export function useStreamsPrivileges(): StreamsPrivileges {
  const {
    core: {
      pricing,
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

  const groupStreamsEnabled = uiSettings.get(OBSERVABILITY_STREAMS_ENABLE_GROUP_STREAMS, false);

  const queryStreamsEnabled = uiSettings.get(OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS, false);

  const significantEventsEnabled = uiSettings.get<boolean>(
    OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS,
    false // Default to false if the setting is not defined or not available
  );

  const significantEventsAvailableForTier = pricing.isFeatureAvailable(
    STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id
  );

  const contentPacksEnabled = uiSettings.get(OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS, false);

  const attachmentsEnabled = uiSettings.get(OBSERVABILITY_STREAMS_ENABLE_ATTACHMENTS, false);

  return {
    ui: streams as {
      [STREAMS_UI_PRIVILEGES.manage]: boolean;
      [STREAMS_UI_PRIVILEGES.show]: boolean;
    },
    features: {
      ui: {
        enabled: true,
      },
      significantEvents: license && {
        enabled: significantEventsEnabled,
        available:
          significantEventsEnabled &&
          license.hasAtLeast('enterprise') &&
          significantEventsAvailableForTier,
      },
      groupStreams: {
        enabled: groupStreamsEnabled,
      },
      queryStreams: {
        enabled: queryStreamsEnabled,
      },
      contentPacks: {
        enabled: contentPacksEnabled,
      },
      attachments: {
        enabled: attachmentsEnabled,
      },
    },
    isLoading: !license,
  };
}
