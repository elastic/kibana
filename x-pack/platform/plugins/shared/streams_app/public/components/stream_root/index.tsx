/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StreamDetailContextProvider } from '../../hooks/use_stream_detail';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useKibana } from '../../hooks/use_kibana';

export function StreamDetailRoot({ children }: { children: React.ReactNode }) {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;

  const {
    path: { key },
  } = useStreamsAppParams('/{key}', true);

  return (
    <StreamDetailContextProvider name={key} streamsRepositoryClient={streamsRepositoryClient}>
      {children}
    </StreamDetailContextProvider>
  );
}
