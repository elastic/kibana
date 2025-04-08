/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { isWiredStreamGetResponse } from '@kbn/streams-schema';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { useStreamsAppBreadcrumbs } from '../../../hooks/use_streams_app_breadcrumbs';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { WiredStreamDetailManagement } from './wired';
import { ClassicStreamDetailManagement } from './classic';

export function StreamDetailManagement() {
  const { definition, refresh } = useStreamDetail();

  const {
    path: { key, tab },
  } = useStreamsAppParams('/{key}/management/{tab}', true);

  useStreamsAppBreadcrumbs(() => {
    return [
      {
        title: 'Edit stream',
        path: `/{key}/management/{tab}`,
        params: { path: { key, tab } },
      } as const,
    ];
  }, [key, tab]);

  if (isWiredStreamGetResponse(definition)) {
    return <WiredStreamDetailManagement definition={definition} refreshDefinition={refresh} />;
  }

  return <ClassicStreamDetailManagement definition={definition} refreshDefinition={refresh} />;
}
