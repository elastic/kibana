/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';
import { VirtualFileSystem } from './filesystem';
import { createResultStore } from './volumes/tool_results';

export const createStore = ({ conversation }: { conversation?: Conversation }) => {
  const filesystem = new VirtualFileSystem();

  const resultStore = createResultStore({ conversation });
  filesystem.mount(resultStore.getVolume());

  return { filesystem, resultStore };
};
