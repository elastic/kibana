/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { TraceViewer } from '../components/traces/trace_viewer';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';

export const AgentBuilderTracesPage = () => {
  const { traceId } = useParams<{ traceId?: string }>();

  useBreadcrumb(
    traceId
      ? [
          { text: labels.traces.libraryTitle, path: appPaths.manage.traces },
          { text: traceId, path: appPaths.manage.traceDetails({ traceId }) },
        ]
      : [{ text: labels.traces.libraryTitle, path: appPaths.manage.traces }]
  );

  return <TraceViewer traceId={traceId} />;
};
