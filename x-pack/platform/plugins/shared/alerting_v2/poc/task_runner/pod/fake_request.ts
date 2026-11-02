/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builds the `fakeRequest` Task Manager would pass to `createTaskRunner`, using the real
 * `kibanaRequestFactory` + `buildTaskFakeRequest` path instead of a hand-shaped object, so any
 * consumer reading headers/space off it sees the real `KibanaRequest` shape.
 */

import { buildTaskFakeRequest } from '@kbn/task-manager-plugin/server/task_running/fake_request_factory';
import type { KibanaRequest } from '@kbn/core-http-server';

export const buildFakeRequest = ({
  apiKey,
  spaceId,
}: {
  apiKey: string;
  spaceId: string;
}): KibanaRequest => {
  const request = buildTaskFakeRequest({ apiKey, spaceId });
  if (!request) throw new Error('buildTaskFakeRequest returned undefined for a run with an apiKey');
  return request;
};
