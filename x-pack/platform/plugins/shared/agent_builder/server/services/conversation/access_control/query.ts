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
 * Matches conversations owned by the current user, on `user_id` when the document stored one and on
 * username only when it did not. Mirrors `isConversationOwner`.
 */
const buildOwnedConversationFilter = ({ user }: { user: UserIdAndName }) => {
  const shouldClauses: Array<Record<string, unknown>> = [];

  if (user.id !== undefined) {
    shouldClauses.push({ term: { user_id: user.id } });
  }

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
 * Matches conversations shared with the current user. Mirrors `isConversationMember`.
 */
const buildSharedConversationFilter = ({ userId }: { userId: string }) => {
  return {
    nested: {
      path: 'access_control.entries',
      ignore_unmapped: true,
      query: {
        bool: {
          filter: [
            { term: { 'access_control.entries.type': 'user' } },
            { term: { 'access_control.entries.id': userId } },
          ],
        },
      },
    },
  };
};

/**
 * Builds the Elasticsearch filter for listing readable conversations.
 *
 * A conversation is listable when it is public, owned by the current user, or shared with them, and
 * its underlying agent is one the user can currently access.
 */
export const buildReadAccessFilter = ({
  user,
  agentIds,
}: {
  user: UserIdAndName;
  agentIds: string[];
}) => {
  const shouldClauses: Array<Record<string, unknown>> = [
    buildPublicConversationFilter(),
    buildOwnedConversationFilter({ user }),
  ];

  if (user.id !== undefined) {
    shouldClauses.push(buildSharedConversationFilter({ userId: user.id }));
  }

  return {
    bool: {
      filter: [
        {
          bool: {
            should: shouldClauses,
            minimum_should_match: 1,
          },
        },
        { terms: { agent_id: agentIds } },
      ],
    },
  };
};

/**
 * Filter clauses for the conversation list endpoint's `pinned` query parameter, empty when it is
 * unset. The per-user match is the Elasticsearch counterpart of `isPinnedBy` (see
 * `client/pinned_by.ts`): `pinned_by` is a nested field, so membership needs a nested query, and
 * `ignore_unmapped` covers indices whose template predates it. The second `should` clause is the
 * same legacy owner-only `pinned` fallback that helper applies; every write since `pinned_by`
 * existed clears that boolean, so the two clauses never both match a document.
 *
 * `pinned: false` negates the match rather than being a `term` on the stored boolean, so
 * documents that predate the field are included instead of silently dropped.
 */
export const buildPinnedFilter = ({
  user,
  pinned,
}: {
  user: UserIdAndName;
  pinned?: boolean;
}): Array<Record<string, unknown>> => {
  if (pinned === undefined) {
    return [];
  }

  const shouldClauses: Array<Record<string, unknown>> = [];

  if (user.id !== undefined) {
    shouldClauses.push({
      nested: {
        path: 'pinned_by',
        ignore_unmapped: true,
        query: { term: { 'pinned_by.userId': user.id } },
      },
    });
  }

  shouldClauses.push({
    bool: { filter: [{ term: { pinned: true } }, buildOwnedConversationFilter({ user })] },
  });

  const pinnedByUser = { bool: { should: shouldClauses, minimum_should_match: 1 } };

  return pinned ? [pinnedByUser] : [{ bool: { must_not: pinnedByUser } }];
};
