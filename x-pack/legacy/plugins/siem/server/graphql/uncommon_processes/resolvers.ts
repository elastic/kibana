/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { UncommonProcesses } from '../../lib/uncommon_processes';
import { createOptionsPaginated } from '../../utils/build_query/create_options';

export interface UncommonProcessesResolversDeps {
  uncommonProcesses: UncommonProcesses;
}

export const createUncommonProcessesResolvers = (
  libs: UncommonProcessesResolversDeps
): {
  Source: {
    UncommonProcesses: SourceResolvers['UncommonProcesses'];
  };
} => ({
  Source: {
    async UncommonProcesses(source, args, { req }, info) {
      const options = createOptionsPaginated(source, args, info);
      return libs.uncommonProcesses.getUncommonProcesses(req, options);
    },
  },
});
