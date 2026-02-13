/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { Streams } from '@kbn/streams-schema';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { useKibana } from '../../../hooks/use_kibana';
import { getStreamDetailHeaderAppActionsConfig } from '../../../header_app_actions/header_app_actions_config';
import { WiredStreamDetailManagement } from './wired';
import { ClassicStreamDetailManagement } from './classic';
import { QueryStreamDetailManagement } from './query';

export function StreamDetailManagement() {
  const { definition, refresh } = useStreamDetail();
  const { core } = useKibana();

  // Global header app actions when viewing a stream (overflow: Feedback, primary: Discover icon)
  useEffect(() => {
    core.chrome.setHeaderAppActionsConfig(getStreamDetailHeaderAppActionsConfig());
    return () => {
      core.chrome.setHeaderAppActionsConfig(undefined);
    };
  }, [core.chrome]);

  if (Streams.WiredStream.GetResponse.is(definition)) {
    return <WiredStreamDetailManagement definition={definition} refreshDefinition={refresh} />;
  }

  if (Streams.QueryStream.GetResponse.is(definition)) {
    return <QueryStreamDetailManagement definition={definition} refreshDefinition={refresh} />;
  }

  return <ClassicStreamDetailManagement definition={definition} refreshDefinition={refresh} />;
}
