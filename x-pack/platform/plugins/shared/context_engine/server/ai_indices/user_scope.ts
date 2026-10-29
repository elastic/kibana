/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { Parser, mutate } from '@elastic/esql';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import {
  isAdminFromRequest,
  isUserPrincipal,
  resolveApiKeyOwnerProfileUid,
  toStableUserId,
  toUserPrincipal,
} from '@kbn/agent-builder-server/identity';
import type { AiIndexDest } from '../../common/http_api/ai_indices';

/*
 * User-scoped documents in the Elastic-managed AI indices, enforced by Kibana.
 *
 * A managed AI index document lists, per space, the Kibana actions a reader must hold
 * (`permissions.kibana.privileges`). A user-scoped document lists a user principal
 * (`user://<stable user id>`) instead. No role grants an action of that shape, so Elasticsearch's
 * document-level security hides it from every direct query. Kibana reads these indices as the
 * internal user with the filter below, which treats the caller's own principal as held and lets an
 * administrator see every user-scoped document.
 */

const PRIVILEGES_PATH = 'permissions.kibana.privileges';
const NAME_FIELD = `${PRIVILEGES_PATH}.name`;
const SPACE_FIELD = `${PRIVILEGES_PATH}.space`;
const COUNT_FIELD = `${PRIVILEGES_PATH}.count`;
const MAX_ACTIONS = 1000;

/** What the caller may see in a managed AI index, in one space. */
export interface ManagedAiIndexAccess {
  spaceId: string;
  /** Kibana actions used in the index that the caller holds in this space. */
  authorizedActions: string[];
  /** The caller's own principal, when they have a stable user id. */
  principal?: string;
  /** An administrator sees every user-scoped document. */
  isAdmin: boolean;
}

/** Managed AI indices are dot-prefixed; their documents carry `permissions`. */
export const isManagedDest = ({ value }: AiIndexDest): boolean =>
  value.split(',').every((target) => target.trim().startsWith('.ai-index-'));

const spaceScope = (spaceId: string): QueryDslQueryContainer => ({
  bool: {
    should: [{ term: { [SPACE_FIELD]: spaceId } }, { term: { [SPACE_FIELD]: '*' } }],
    minimum_should_match: 1,
  },
});

/**
 * The managed AI index visibility rule: a document with no privilege entries is public; otherwise
 * one entry of this space must be public, or list only actions and principals the caller holds.
 * An administrator also sees an entry whose unmet requirement is one user principal.
 *
 * `minimum_should_match: 1` must stay: in a filter context a should-only bool matches everything.
 */
export const buildManagedVisibilityFilter = ({
  spaceId,
  authorizedActions,
  principal,
  isAdmin,
}: ManagedAiIndexAccess): QueryDslQueryContainer => {
  const held = principal !== undefined ? [...authorizedActions, principal] : authorizedActions;
  return {
    bool: {
      minimum_should_match: 1,
      should: [
        {
          bool: {
            must_not: [{ nested: { path: PRIVILEGES_PATH, query: { match_all: {} } } }],
          },
        },
        {
          nested: {
            path: PRIVILEGES_PATH,
            score_mode: 'none',
            query: {
              bool: {
                filter: [
                  spaceScope(spaceId),
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          bool: {
                            filter: [
                              { term: { [COUNT_FIELD]: 0 } },
                              { bool: { must_not: [{ exists: { field: NAME_FIELD } }] } },
                            ],
                          },
                        },
                        {
                          bool: {
                            filter: [
                              { range: { [COUNT_FIELD]: { gt: 0 } } },
                              {
                                terms_set: {
                                  [NAME_FIELD]: {
                                    terms: held,
                                    minimum_should_match_field: COUNT_FIELD,
                                  },
                                },
                              },
                            ],
                          },
                        },
                        ...(isAdmin ? [adminSeeThrough(authorizedActions)] : []),
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    },
  };
};

/** An entry scoped to a user: the principal counts as held, the other actions still apply. */
const adminSeeThrough = (authorizedActions: string[]): QueryDslQueryContainer => ({
  bool: {
    filter: [
      { prefix: { [NAME_FIELD]: 'user://' } },
      {
        bool: {
          minimum_should_match: 1,
          should: [
            { term: { [COUNT_FIELD]: 1 } },
            {
              terms_set: {
                [NAME_FIELD]: {
                  terms: authorizedActions,
                  minimum_should_match_script: {
                    source: "Math.max(doc['permissions.kibana.privileges.count'].value - 1, 1)",
                  },
                },
              },
            },
          ],
        },
      },
    ],
  },
});

const enumerateActions = async ({
  internalClient,
  indices,
  spaceId,
}: {
  internalClient: ElasticsearchClient;
  indices: string[];
  spaceId: string;
}): Promise<string[]> => {
  const response = await internalClient.search({
    index: indices,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 0,
    aggs: {
      privileges: {
        nested: { path: PRIVILEGES_PATH },
        aggs: {
          in_space: {
            filter: spaceScope(spaceId),
            aggs: { names: { terms: { field: NAME_FIELD, size: MAX_ACTIONS } } },
          },
        },
      },
    },
  });
  if ((response._shards?.failed ?? 0) > 0) {
    throw new Error('Could not resolve AI index permissions; please retry.');
  }
  const buckets =
    (
      response.aggregations as
        | { privileges?: { in_space?: { names?: { buckets?: Array<{ key: string }> } } } }
        | undefined
    )?.privileges?.in_space?.names?.buckets ?? [];
  return buckets.map(({ key }) => key).filter((name) => !isUserPrincipal(name));
};

export interface ManagedAiIndexAccessResolverDeps {
  internalClient: ElasticsearchClient;
  coreSecurity: SecurityServiceStart;
  authz?: SecurityPluginStart['authz'];
  logger: Logger;
}

/** Resolves who the caller is and what they hold, for reads of managed AI indices. */
export const resolveManagedAiIndexAccess = async (
  { internalClient, coreSecurity, authz, logger }: ManagedAiIndexAccessResolverDeps,
  {
    request,
    scopedClient,
    spaceId,
    indices,
  }: {
    request: KibanaRequest;
    scopedClient: ElasticsearchClient;
    spaceId: string;
    indices: string[];
  }
): Promise<ManagedAiIndexAccess> => {
  const actions = await enumerateActions({ internalClient, indices, spaceId });
  let authorizedActions: string[] = [];
  if (actions.length > 0 && authz) {
    try {
      const { privileges } = await authz.checkPrivilegesDynamicallyWithRequest(request)({
        kibana: actions,
      });
      authorizedActions = privileges.kibana
        .filter(({ authorized }) => authorized)
        .map(({ privilege }) => privilege);
    } catch (error) {
      // Failing closed: an error must never widen what the caller sees.
      logger.warn(`AI index privilege check failed; failing closed: ${(error as Error).message}`);
    }
  }
  const userId = await toStableUserId({
    authUser: coreSecurity.authc.getCurrentUser(request) ?? {},
    request,
    resolveApiKeyProfileUid: () => resolveApiKeyOwnerProfileUid({ request, esClient: scopedClient }),
  });
  return {
    spaceId,
    authorizedActions,
    ...(userId !== undefined && { principal: toUserPrincipal(userId) }),
    isAdmin: await isAdminFromRequest({ esClient: scopedClient }),
  };
};

/**
 * An internal-user client that only reads what `visibility` allows: every `search` and ES|QL
 * query gets it as a filter, and other read methods are refused. Writes go through unfiltered, so
 * a caller must locate a document with a filtered read before writing it.
 */
export const createVisibilityScopedClient = (
  internalClient: ElasticsearchClient,
  visibility: QueryDslQueryContainer
): ElasticsearchClient => {
  const filtered = (query: QueryDslQueryContainer | undefined): QueryDslQueryContainer => ({
    bool: { filter: query !== undefined ? [visibility, query] : [visibility] },
  });
  // `apply` traps keep the client's overloaded signatures; only the first argument changes.
  const search = new Proxy(internalClient.search, {
    apply(target, thisArg, [params, ...rest]) {
      return Reflect.apply(target, internalClient, [
        { ...params, query: filtered(params?.query) },
        ...rest,
      ]);
    },
  });
  const esqlQuery = new Proxy(internalClient.esql.query, {
    apply(target, thisArg, [params, ...rest]) {
      return Reflect.apply(target, internalClient.esql, [
        { ...params, filter: filtered(params?.filter) },
        ...rest,
      ]);
    },
  });
  const esql = new Proxy(internalClient.esql, {
    get(target, property, receiver) {
      return property === 'query' ? esqlQuery : Reflect.get(target, property, receiver);
    },
  });
  const allowed = new Set<PropertyKey>(['index', 'update', 'delete', 'create']);
  return new Proxy(internalClient, {
    get(target, property, receiver) {
      if (property === 'search') {
        return search;
      }
      if (property === 'esql') {
        return esql;
      }
      // Not a thenable: awaiting the client must not resolve to something else.
      if (property === 'then') {
        return undefined;
      }
      if (typeof property === 'string' && !allowed.has(property)) {
        throw new Error(`The user-scoped AI index client does not support "${property}".`);
      }
      const value = Reflect.get(target, property, target);
      // A client method reads its own internals through `this`, so it must not see the proxy.
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
};

/** Commands that only transform rows already read: anything else could read another index. */
const ROW_COMMANDS = new Set([
  'from',
  'where',
  'eval',
  'keep',
  'drop',
  'rename',
  'sort',
  'limit',
  'stats',
  'inline stats',
  'inlinestats',
  'mv_expand',
  'dissect',
  'grok',
  'sample',
]);

/**
 * True when a query only reads managed AI indices, with commands that cannot reach another index,
 * so it may run as the internal user under the visibility filter.
 */
export const readsOnlyManagedAiIndices = (query: string, managedTargets: string[]): boolean => {
  const { root, errors } = Parser.parse(query);
  if (errors.length > 0 || root.commands.length === 0) {
    return false;
  }
  if (!root.commands.every(({ name }) => ROW_COMMANDS.has(name.toLowerCase()))) {
    return false;
  }
  const sources = [...mutate.commands.from.sources.list(root)];
  return (
    sources.length > 0 &&
    sources.every((source) => {
      const name = source.index?.valueUnquoted ?? source.name;
      return source.prefix === undefined && managedTargets.includes(name);
    })
  );
};
