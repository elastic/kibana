/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { RedirectTo } from '../redirect_to';
import { StreamListView } from '../stream_list_view';
import { DEFAULT_STREAMS_LAYOUT_TAB } from '../streams_layout/tabs';

/**
 * Renders the landing view for the app root, which is the tabbed layout when Canvas is enabled and
 * the stream list otherwise.
 */
export function StreamsRootRedirect() {
  const {
    features: { canvas },
  } = useStreamsPrivileges();

  if (canvas.enabled) {
    return (
      <RedirectTo
        path="/new-experience/{tab}"
        params={{ path: { tab: DEFAULT_STREAMS_LAYOUT_TAB } }}
      />
    );
  }

  return <StreamListView />;
}
