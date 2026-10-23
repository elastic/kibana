/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type {
  SmlAutocompleteHttpResponse,
  SmlAutocompleteHttpResultItem,
} from '../../common/http_api/sml';
import {
  SML_HTTP_AUTOCOMPLETE_QUERY_MAX_LENGTH,
  SmlSearchFilterType,
} from '../../common/http_api/sml';
import { smlAutocompletePath } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { SmlAutocompleteResult, SmlService } from '../services/sml/types';
import { smlEntryId, smlOriginUri } from '../services/sml/sml_origin';
import type { AgentBuilderSmlStartDependencies, AgentBuilderSmlPluginStart } from '../types';

const SML_AUTOCOMPLETE_SIZE_MAX = 50;

// Agent Builder users can look items up through the APIs of the types, which check access
// themselves. The SML index needs the SML privilege, which the handler checks on that path.
const AUTOCOMPLETE_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [{ anyRequired: [apiPrivileges.readAgentBuilderSml, 'agentBuilder:read'] }],
  },
};

type AutocompleteParams = Parameters<SmlService['autocomplete']>[0];

/** The title to look up in a type: what follows `type/`, or the whole text if it is no type keyword. */
const getTitleTerm = (query: string, typeId: string) => {
  const text = query.trim();
  const slashIndex = text.indexOf('/');
  const isTypeKeyword = (keyword: string) => typeId.startsWith(keyword.toLowerCase());
  if (text === '*') return '';
  if (slashIndex === -1) return isTypeKeyword(text) ? '' : text;
  const typePart = text.slice(0, slashIndex).trim();
  return typePart === '' || isTypeKeyword(typePart) ? text.slice(slashIndex + 1).trim() : undefined;
};

/** What the index autocomplete returns, looked up through the API of each type instead. */
const autocompleteFromTypes = async (
  {
    query,
    size = 10,
    spaceId,
    request,
    savedObjectsClient,
    hasApiPrivileges,
    constraints,
    filters,
  }: Omit<AutocompleteParams, 'esClient'> & {
    savedObjectsClient: SavedObjectsClientContract;
    hasApiPrivileges: (actions: readonly string[]) => Promise<boolean>;
  },
  sml: SmlService,
  logger: Logger
): Promise<SmlAutocompleteResult[]> => {
  // Items from the APIs carry no tags, so none of them can match a tag filter.
  if (filters?.tags?.length) return [];
  const lookups = sml
    .listTypeDefinitions()
    .filter(
      ({ id, searchByTitle }) => searchByTitle && (!filters?.types || filters.types.includes(id))
    );
  const results = await Promise.all(
    lookups.map(async ({ id: type, searchByTitle }) => {
      const title = getTitleTerm(query, type);
      if (title === undefined) return [];
      try {
        const items = await searchByTitle!(
          { title, size, constraints },
          { request, savedObjectsClient, spaceId, hasApiPrivileges }
        );
        return items.map(({ originId, title: itemTitle }) => ({
          id: smlEntryId(type, originId),
          type,
          title: itemTitle,
          origin: { uri: smlOriginUri(type, originId) },
        }));
      } catch (error) {
        logger.warn(`SML autocomplete lookup for '${type}' failed: ${(error as Error).message}`);
        return [];
      }
    })
  );
  // Take turns between the types, so that one cannot crowd out the others.
  const rounds = Math.max(0, ...results.map((items) => items.length));
  return Array.from({ length: rounds }, (_, round) =>
    results.flatMap((items) => items.slice(round, round + 1))
  )
    .flat()
    .slice(0, size);
};

export const registerAutocompleteRoute = ({
  router,
  coreSetup,
  logger,
  getSmlService,
}: {
  router: IRouter;
  coreSetup: CoreSetup<AgentBuilderSmlStartDependencies, AgentBuilderSmlPluginStart>;
  logger: Logger;
  getSmlService: () => SmlService;
}) => {
  router.post(
    {
      path: smlAutocompletePath,
      validate: {
        body: schema.object({
          query: schema.string({ minLength: 1, maxLength: SML_HTTP_AUTOCOMPLETE_QUERY_MAX_LENGTH }),
          size: schema.maybe(schema.number({ min: 1, max: SML_AUTOCOMPLETE_SIZE_MAX })),
          // Runtime-imposed per-type constraints (e.g. agent-centric connector
          // allow-list). Same shape as the `constraints` field on POST /sml/_search
          // so a single FE scope-builder can feed either route.
          constraints: schema.maybe(
            schema.recordOf(
              schema.literal(SmlSearchFilterType.connector),
              schema.object({
                ids: schema.maybe(
                  schema.arrayOf(schema.string({ maxLength: 100 }), { maxSize: 100 })
                ),
              })
            )
          ),
          // Caller-supplied type/tag refinements — same shape as on POST /sml/_search.
          // Useful for specialized UI pickers (e.g. connectors-only # menu).
          filters: schema.maybe(
            schema.object({
              types: schema.maybe(
                schema.arrayOf(schema.string({ maxLength: 200 }), { maxSize: 100 })
              ),
              tags: schema.maybe(
                schema.arrayOf(schema.string({ maxLength: 200 }), { maxSize: 100 })
              ),
            })
          ),
        }),
      },
      options: { access: 'internal' },
      security: AUTOCOMPLETE_SECURITY,
    },
    async (ctx, request, response) => {
      try {
        const sml = getSmlService();
        const { query, size, constraints, filters } = request.body;
        const coreContext = await ctx.core;
        const esClient = coreContext.elasticsearch.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        // The SML index belongs to the experimental features; without them, ask the types' own APIs.
        const isIndexEnabled = await coreContext.uiSettings.client.get<boolean>(
          AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID
        );
        const hasApiPrivileges = async (actions: readonly string[]) => {
          const { security } = startDeps;
          if (!security) return true;
          const { hasAllRequested } = await security.authz
            .checkPrivilegesWithRequest(request)
            .atSpace(spaceId, {
              kibana: actions.map((action) => security.authz.actions.api.get(action)),
            });
          return hasAllRequested;
        };
        if (isIndexEnabled && !(await hasApiPrivileges([apiPrivileges.readAgentBuilderSml]))) {
          return response.forbidden();
        }
        const params = { query, size, spaceId, request, constraints, filters };
        const results = isIndexEnabled
          ? (await sml.autocomplete({ ...params, esClient })).results
          : await autocompleteFromTypes(
              {
                ...params,
                savedObjectsClient: coreContext.savedObjects.client,
                hasApiPrivileges,
              },
              sml,
              logger
            );

        const body: SmlAutocompleteHttpResponse = {
          results: results.map(
            ({ id, type, origin, title }): SmlAutocompleteHttpResultItem => ({
              id,
              type,
              origin,
              title,
            })
          ),
        };

        return response.ok({ body });
      } catch (error) {
        logger.error(`SML autocomplete route error: ${(error as Error).message}`);
        throw error;
      }
    }
  );
};
