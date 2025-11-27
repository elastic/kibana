/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import { createServerRoute } from '../create_server_route';
import type { Attachment } from '../../lib/streams/attachments/types';

export interface ListRulesResponse {
  rules: Attachment[];
}

export interface LinkRuleResponse {
  acknowledged: boolean;
}

export interface UnlinkRuleResponse {
  acknowledged: boolean;
}

export interface SuggestRulesResponse {
  suggestions: Attachment[];
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
    const { attachmentClient, streamsClient } = await getScopedClients({ request });
    await streamsClient.ensureStream(params.path.name);

    const {
      path: { name: streamName },
    } = params;

    function isRule(attachment: Attachment) {
      return attachment.type === 'rule';
    }

    return {
      rules: (await attachmentClient.getAttachments(streamName, 'rule')).filter(isRule),
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
    const { attachmentClient, streamsClient } = await getScopedClients({ request });
    const {
      path: { ruleId, name: streamName },
    } = params;

    await streamsClient.ensureStream(streamName);

    await attachmentClient.linkAttachment(streamName, {
      id: ruleId,
      type: 'rule',
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
    const { attachmentClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);

    const {
      path: { ruleId, name: streamName },
    } = params;

    await attachmentClient.unlinkAttachment(streamName, {
      id: ruleId,
      type: 'rule',
    });

    return {
      acknowledged: true,
    };
  },
});

const suggestRulesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/rules/_suggestions',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    query: z.object({
      query: z.string(),
    }),
    body: z.object({
      tags: z.optional(z.array(z.string())),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<SuggestRulesResponse> => {
    const { attachmentClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);

    const {
      query: { query },
      body: { tags },
    } = params;

    const suggestions = (
      await attachmentClient.getSuggestions({
        attachmentTypes: ['rule'],
        query,
        tags,
      })
    ).attachments;

    return {
      suggestions,
    };
  },
});

export const ruleRoutes = {
  ...listRulesRoute,
  ...linkRuleRoute,
  ...unlinkRuleRoute,
  ...suggestRulesRoute,
};
