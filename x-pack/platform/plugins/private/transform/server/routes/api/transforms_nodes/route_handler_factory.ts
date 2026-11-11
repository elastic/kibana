/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RequestHandler } from '@kbn/core/server';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type { License } from '../../../services';
import { NODES_INFO_PRIVILEGES } from '../../../../common/constants';

import { wrapError, wrapEsError } from '../../utils/error_utils';

const NODE_ROLES = 'roles';
const REQUIRED_CROSS_PROJECT_FEATURE_FLAGS = [
  'es.transform_cross_project_feature_flag_enabled',
  'es.ml_cross_project_feature_flag_enabled',
] as const;

interface NodesAttributes {
  jvm?: {
    input_arguments?: string[];
  };
  roles: string[];
}

type Nodes = Record<string, NodesAttributes>;

export const isNodes = (arg: unknown): arg is Nodes => {
  return (
    isPopulatedObject(arg) &&
    Object.values(arg).every(
      (node) => isPopulatedObject(node, [NODE_ROLES]) && Array.isArray(node.roles)
    )
  );
};

const isFeatureFlagEnabled = ({
  featureFlag,
  inputArguments,
  isSnapshotBuild,
}: {
  featureFlag: (typeof REQUIRED_CROSS_PROJECT_FEATURE_FLAGS)[number];
  inputArguments?: string[];
  isSnapshotBuild: boolean;
}): boolean => {
  const argumentPrefix = `-D${featureFlag}=`;

  for (let index = (inputArguments?.length ?? 0) - 1; index >= 0; index--) {
    const argument = inputArguments?.[index];
    if (argument?.startsWith(argumentPrefix)) {
      return argument.slice(argumentPrefix.length) === 'true';
    }
  }

  return isSnapshotBuild;
};

export const areCrossProjectFeatureFlagsEnabled = (
  nodes: unknown,
  isSnapshotBuild: boolean
): boolean => {
  if (!isNodes(nodes)) {
    return false;
  }

  return Object.values(nodes).every(({ jvm }) =>
    REQUIRED_CROSS_PROJECT_FEATURE_FLAGS.every((featureFlag) =>
      isFeatureFlagEnabled({
        featureFlag,
        inputArguments: jvm?.input_arguments,
        isSnapshotBuild,
      })
    )
  );
};

export const routeHandlerFactory: (
  license: License
) => RequestHandler<undefined, undefined, undefined> = (license) => async (ctx, req, res) => {
  try {
    const esClient = (await ctx.core).elasticsearch.client;
    // If security is enabled, check that the user has at least permission to
    // view transforms before calling the _nodes endpoint with the internal user.
    if (license.getStatus().isSecurityEnabled === true) {
      const { has_all_requested: hasAllPrivileges } =
        await esClient.asCurrentUser.security.hasPrivileges({
          cluster: NODES_INFO_PRIVILEGES,
        });

      if (!hasAllPrivileges) {
        return res.customError(wrapError(new Boom.Boom('Forbidden', { statusCode: 403 })));
      }
    }

    const [{ nodes }, { version }] = await Promise.all([
      esClient.asInternalUser.nodes.info({
        filter_path: `nodes.*.${NODE_ROLES},nodes.*.jvm.input_arguments`,
      }),
      esClient.asInternalUser.info(),
    ]);

    let count = 0;
    if (isNodes(nodes)) {
      for (const { roles } of Object.values(nodes)) {
        if (roles.includes('transform')) {
          count++;
        }
      }
    }

    return res.ok({
      body: {
        count,
        isCrossProjectEnabled: areCrossProjectFeatureFlagsEnabled(nodes, version.build_snapshot),
      },
    });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};
