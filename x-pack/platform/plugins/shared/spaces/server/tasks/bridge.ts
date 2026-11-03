/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTasksKibanaBridge } from '@kbn/core-plugins-server';

import type { Space } from '../../common';

/**
 * The plugin's real service in Kibana, which registers the `space` saved object type and looks up
 * space documents through the spaces client; a task pod builds its own over the internal repository.
 */
export const spacesBridge = createTasksKibanaBridge<
  true,
  { getActiveSpace: (request: { spaceId?: string }) => Promise<Space> }
>();
