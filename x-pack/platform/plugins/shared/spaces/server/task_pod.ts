/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { definePodPlugin } from '@kbn/task-manager-plugin/server/task_pod';

import { namespaceToSpaceId, spaceIdToNamespace } from './lib/utils/namespace';

/**
 * The part of the Spaces contract a task needs in a task pod: reading the space a (fake) request
 * runs in and converting between space ids and saved object namespaces. Looking up space
 * documents (`getActiveSpace`) is not available in a pod.
 */
export const podPlugins = [
  definePodPlugin({
    id: 'spaces',
    start: () => ({
      spacesService: {
        getSpaceId: (request: { spaceId?: string }) => request.spaceId ?? DEFAULT_SPACE_ID,
        isInDefaultSpace: (request: { spaceId?: string }) =>
          (request.spaceId ?? DEFAULT_SPACE_ID) === DEFAULT_SPACE_ID,
        spaceIdToNamespace,
        namespaceToSpaceId,
      },
    }),
  }),
];
