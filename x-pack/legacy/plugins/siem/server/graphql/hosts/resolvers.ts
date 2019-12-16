/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { SourceResolvers } from '../../graphql/types';
import {
  Hosts,
  HostOverviewRequestOptions,
  HostsRequestOptions,
  HostLastFirstSeenRequestOptions,
} from '../../lib/hosts';
import { getFields } from '../../utils/build_query';
import { createOptionsPaginated } from '../../utils/build_query/create_options';

export interface HostsResolversDeps {
  hosts: Hosts;
}

export const createHostsResolvers = (
  libs: HostsResolversDeps
): {
  Source: {
    Hosts: SourceResolvers['Hosts'];
    HostOverview: SourceResolvers['HostOverview'];
    HostFirstLastSeen: SourceResolvers['HostFirstLastSeen'];
  };
} => ({
  Source: {
    async Hosts(source, args, { req }, info) {
      const options: HostsRequestOptions = {
        ...createOptionsPaginated(source, args, info),
        sort: args.sort,
        defaultIndex: args.defaultIndex,
      };
      return libs.hosts.getHosts(req, options);
    },
    async HostOverview(source, args, { req }, info) {
      const fields = getFields(getOr([], 'fieldNodes[0]', info));
      const options: HostOverviewRequestOptions = {
        defaultIndex: args.defaultIndex,
        sourceConfiguration: source.configuration,
        fields: fields.map(field => field.replace('edges.node.', '')),
        hostName: args.hostName,
        timerange: args.timerange,
      };
      return libs.hosts.getHostOverview(req, options);
    },
    async HostFirstLastSeen(source, args, { req }) {
      const options: HostLastFirstSeenRequestOptions = {
        sourceConfiguration: source.configuration,
        hostName: args.hostName,
        defaultIndex: args.defaultIndex,
      };
      return libs.hosts.getHostFirstLastSeen(req, options);
    },
  },
});
