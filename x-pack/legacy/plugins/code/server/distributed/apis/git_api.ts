/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GitOperations } from '../../git_operations';
import { FileTree } from '../../../model';
import { RequestContext, ServiceHandlerFor } from '../service_definition';

export const GitServiceDefinition = {
  fileTree: {
    request: {} as {
      uri: string;
      path: string;
      revision: string;
      skip: number;
      limit: number;
      withParents: boolean;
      depth: number;
      flatten: boolean;
    },
    response: {} as FileTree,
  },
};

export const getGitServiceHandler = (
  gitOps: GitOperations
): ServiceHandlerFor<typeof GitServiceDefinition> => ({
  async fileTree(
    { uri, path, revision, skip, limit, withParents, depth, flatten },
    context: RequestContext
  ) {
    return await gitOps.fileTree(uri, path, revision, skip, limit, withParents, depth, flatten);
  },
});
