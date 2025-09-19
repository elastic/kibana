/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import { FAILURE_STORE_SELECTOR } from '../../../../util/constants';

export const getFailureStoreIndexName = (definition: Streams.ingest.all.GetResponse) => {
  const isClassic = Streams.ClassicStream.GetResponse.is(definition);
  return isClassic
    ? definition.stream.name
    : `${definition.stream.name}${FAILURE_STORE_SELECTOR},${definition.stream.name}.*${FAILURE_STORE_SELECTOR}`;
};
