/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Streams } from '@kbn/streams-schema';
import { useStreamDetail } from '../../../hooks/use_stream_detail';
import { WiredStreamDetailManagement } from './wired';
import { ClassicStreamDetailManagement } from './classic';

export function StreamDetailManagement() {
  const { definition, refresh } = useStreamDetail();

  if (Streams.WiredStream.GetResponse.is(definition)) {
    return <WiredStreamDetailManagement definition={definition} refreshDefinition={refresh} />;
  }

  return <ClassicStreamDetailManagement definition={definition} refreshDefinition={refresh} />;
}
