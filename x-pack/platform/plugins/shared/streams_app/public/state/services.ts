/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';

let streamsClient: any;
let coreStart: CoreStart;

export const setServices = (services: { streamsClient: any; coreStart: CoreStart }) => {
  streamsClient = services.streamsClient;
  coreStart = services.coreStart;
};

export const getStreamsClient = () => {
  if (!streamsClient) {
    throw new Error('Streams client not initialized');
  }
  return streamsClient;
};

export const getCoreStart = () => {
  if (!coreStart) {
    throw new Error('Core services not initialized');
  }
  return coreStart;
};
