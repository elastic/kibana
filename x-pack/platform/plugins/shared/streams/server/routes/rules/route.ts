/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import type { Asset, RuleAsset } from '../../../common/assets';
import { createServerRoute } from '../create_server_route';
import { ASSET_ID, ASSET_TYPE } from '../../lib/streams/assets/fields';

export interface SanitizedRuleAsset {
  id: string;
  title: string;
  tags: string[];
}

export interface ListRulesResponse {
  rules: SanitizedRuleAsset[];
}

export interface LinkRuleResponse {
  acknowledged: boolean;
}

export interface UnlinkRuleResponse {
  acknowledged: boolean;
}

function sanitizeRuleAsset(asset: RuleAsset): SanitizedRuleAsset {
  return {
    id: asset[ASSET_ID],
    title: asset.title,
    tags: asset.tags,
  };
}

const listRulesRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/rules 2023-10-31',
  options: {
    access: 'public',
    summary: 'Get stream rules',
    description:
      'Fetches all rules linked to a stream that are visible to the current user in the current space.',
    availability: {
      stability: 'experimental',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  async handler({ params, request, getScopedClients }): Promise<ListRulesResponse> {
    const { assetClient, streamsClient } = await getScopedClients({ request });
    await streamsClient.ensureStream(params.path.name);

    const {
      path: { name: streamName },
    } = params;

    function isRule(asset: Asset): asset is RuleAsset {
      return asset[ASSET_TYPE] === 'rule';
    }

    return {
      rules: (await assetClient.getAssets(streamName)).filter(isRule).map(sanitizeRuleAsset),
    };
  },
});

const linkRuleRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{name}/rules/{ruleId} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Link a rule to a stream',
    description: 'Links a rule to a stream. Noop if the rule is already linked to the stream.',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      ruleId: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<LinkRuleResponse> => {
    const { assetClient, streamsClient } = await getScopedClients({ request });
    const {
      path: { ruleId, name: streamName },
    } = params;

    await streamsClient.ensureStream(streamName);

    await assetClient.linkAsset(streamName, {
      [ASSET_TYPE]: 'rule',
      [ASSET_ID]: ruleId,
    });

    return {
      acknowledged: true,
    };
  },
});

const unlinkRuleRoute = createServerRoute({
  endpoint: 'DELETE /api/streams/{name}/rules/{ruleId} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Unlink a rule from a stream',
    description: 'Unlinks a rule from a stream. Noop if the rule is not linked to the stream.',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      ruleId: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<UnlinkRuleResponse> => {
    const { assetClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);

    const {
      path: { ruleId, name: streamName },
    } = params;

    await assetClient.unlinkAsset(streamName, {
      [ASSET_ID]: ruleId,
      [ASSET_TYPE]: 'rule',
    });

    return {
      acknowledged: true,
    };
  },
});

export const ruleRoutes = {
  ...listRulesRoute,
  ...linkRuleRoute,
  ...unlinkRuleRoute,
};
