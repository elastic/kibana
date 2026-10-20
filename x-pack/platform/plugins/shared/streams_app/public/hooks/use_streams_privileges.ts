/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS,
  OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS,
  OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS,
  OBSERVABILITY_STREAMS_ENABLE_DRAFT_STREAMS,
  OBSERVABILITY_STREAMS_ENABLE_CANVAS,
} from '@kbn/management-settings-ids';
import type { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from './use_kibana';

export type StreamsPrivileges = ReturnType<typeof useStreamsPrivileges>;
export type StreamsFeatures = StreamsPrivileges['features'];

export function useStreamsPrivileges() {
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

  // undefined while the license$ has not emitted yet (loading).
  const license = useObservable(licensing.license$);

  const queryStreamsEnabled = uiSettings.get(OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS, false);

  const contentPacksEnabled = uiSettings.get(OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS, false);

  const wiredStreamViewsEnabled = uiSettings.get(
    OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS,
    false
  );

  const draftStreamsEnabled = uiSettings.get(OBSERVABILITY_STREAMS_ENABLE_DRAFT_STREAMS, false);
  const canvasEnabled = uiSettings.get(OBSERVABILITY_STREAMS_ENABLE_CANVAS, false);

  return {
    ui: streams as {
      [STREAMS_UI_PRIVILEGES.manage]: boolean;
      [STREAMS_UI_PRIVILEGES.show]: boolean;
    },
    features: {
      ui: {
        enabled: true,
      },
      queryStreams: {
        enabled: queryStreamsEnabled,
      },
      contentPacks: {
        enabled: contentPacksEnabled,
      },
      wiredStreamViews: {
        enabled: wiredStreamViewsEnabled,
      },
      draftStreams: {
        enabled: draftStreamsEnabled,
      },
      canvas: {
        enabled: canvasEnabled,
      },
    },
    isLoading: !license,
  };
}
