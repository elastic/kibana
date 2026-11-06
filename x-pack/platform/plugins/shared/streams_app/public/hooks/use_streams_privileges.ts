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
import { STREAMS_V2_FEATURE_ID } from '@kbn/streams-plugin/public';
import type { STREAMS_UI_PRIVILEGES, STREAMS_V2_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from './use_kibana';

export type StreamsPrivileges = ReturnType<typeof useStreamsPrivileges>;
export type StreamsFeatures = StreamsPrivileges['features'];

export function useStreamsPrivileges() {
  const {
    core: {
      application: {
        capabilities: { streams, [STREAMS_V2_FEATURE_ID]: streamsV2 },
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

  const ui = streams as {
    [STREAMS_UI_PRIVILEGES.manage]: boolean;
    [STREAMS_UI_PRIVILEGES.show]: boolean;
  };
  // The V2 feature is only registered when the canvas is enabled in kibana.yml.
  const v2 = {
    show: Boolean(streamsV2?.show),
    manage: Boolean(streamsV2?.manage),
  } satisfies Record<keyof typeof STREAMS_V2_UI_PRIVILEGES, boolean>;

  return {
    ui,
    v2,
    /** Which experiences the user may open: legacy stream pages, and the unit map and tables. */
    access: {
      legacy: Boolean(ui?.show),
      v2: canvasEnabled && v2.show,
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
