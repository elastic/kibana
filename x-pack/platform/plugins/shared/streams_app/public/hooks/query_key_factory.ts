/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const streamsKeys = {
  all: ['streams'] as const,
  streams: (name?: string) => [...streamsKeys.all, 'details', { name }] as const,
};

export type StreamsKeys = typeof streamsKeys;
