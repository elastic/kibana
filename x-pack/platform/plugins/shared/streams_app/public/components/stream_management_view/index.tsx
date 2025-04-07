/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { StreamDetailManagement } from '../data_management/stream_detail_management';
import { StreamDetailContextProvider } from '../../hooks/use_stream_detail';

export function StreamManagementView() {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;

  const {
    path: { key: name },
  } = useStreamsAppParams('/{key}/management', true);

  return (
    <StreamDetailContextProvider name={name} streamsRepositoryClient={streamsRepositoryClient}>
      <StreamDetailManagement />;
    </StreamDetailContextProvider>
  );
}
