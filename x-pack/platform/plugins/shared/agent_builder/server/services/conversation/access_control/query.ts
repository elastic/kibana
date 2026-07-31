/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '@kbn/agent-builder-common';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common';

/**
 * Matches conversations marked as public.
 */
const buildPublicConversationFilter = () => {
  return { term: { 'access_control.access_mode': ConversationAccessControlMode.Public } };
};

/**
 * Matches conversations owned by the current user, on the stable `user_id` when the document
 * stored one, or on username only when it did not. Mirrors `isConversationOwner` so listing
 * cannot surface conversations the get/update paths would deny.
 */
const buildOwnedConversationFilter = ({ user }: { user: UserIdAndName }) => {
  const shouldClauses: Array<Record<string, unknown>> = [];

  if (user.id !== undefined) {
    shouldClauses.push({ term: { user_id: user.id } });
  }

  // Ownership for docs without user_id: username match only when user_id was never stored, so
  // id-backed conversations are not reopened to same-username principals from other realms.
  shouldClauses.push({
    bool: {
      must_not: { exists: { field: 'user_id' } },
      filter: { term: { user_name: user.username } },
    },
  });

  return {
    bool: {
      should: shouldClauses,
      minimum_should_match: 1,
    },
  };
};

/**
 * Builds the Elasticsearch filter for listing readable conversations.
 *
 * A conversation is listable when it is public or owned by the current user, and
 * its underlying agent is one the user can currently access.
 */
export const buildReadAccessFilter = ({
  user,
  agentIds,
}: {
  user: UserIdAndName;
  agentIds: string[];
}) => {
  return {
    bool: {
      filter: [
        {
          bool: {
            should: [buildPublicConversationFilter(), buildOwnedConversationFilter({ user })],
            minimum_should_match: 1,
          },
        },
        { terms: { agent_id: agentIds } },
      ],
    },
  };
};
