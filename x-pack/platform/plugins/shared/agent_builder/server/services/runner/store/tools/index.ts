/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
import { readTool } from './read';
import { lsTool } from './ls';
import { globTool } from './glob';
import { grepTool } from './grep';

export const getStoreTools = ({
  filestore,
}: {
  filestore: IFileStore;
}): BuiltinToolDefinition<any>[] => {
  return [
    readTool({ filestore }),
    lsTool({ filestore }),
    globTool({ filestore }),
    grepTool({ filestore }),
  ];
};
