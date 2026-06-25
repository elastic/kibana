/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../constants';
import { AgentlessPolicySchema } from '../../../common/types/models/agentless_policy_schema';

import { validateKuery } from '../../routes/utils/filter_utils';
import { ListResponseSchema } from '../../routes/schema/utils';

/**
 * Restricts agentless LIST filtering to the fields exposed by the clean
 * `AgentlessPolicy` contract. `validateKuery` rejects any field that is not
 * present in this mapping, so callers cannot filter on the underlying Fleet
 * package-policy internals (e.g. `policy_ids`, `revision`, `supports_agentless`)
 * that this API deliberately hides.
 *
 * `supports_agentless` is intentionally excluded: the service always ANDs
 * `supports_agentless:true` onto the query to scope results to agentless
 * policies, so it must not be something callers can filter (or override).
 */
export const AGENTLESS_POLICY_FILTER_MAPPINGS = {
  properties: {
    name: { type: 'keyword' },
    namespace: { type: 'keyword' },
    package: {
      properties: {
        name: { type: 'keyword' },
      },
    },
  },
} as const;

interface FilterMappingNode {
  readonly type?: string;
  readonly properties?: Readonly<Record<string, FilterMappingNode>>;
}

/**
 * Walks a mapping's `properties` tree and returns the dotted paths of every leaf
 * field (e.g. `name`, `package.name`). Used to keep the allowed-filter-field list
 * single-sourced from {@link AGENTLESS_POLICY_FILTER_MAPPINGS} rather than
 * duplicating it in the OpenAPI description and the validation error message.
 */
const getLeafFieldPaths = (
  properties: Readonly<Record<string, FilterMappingNode>>,
  prefix = ''
): string[] =>
  Object.entries(properties).flatMap(([key, node]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return node.properties ? getLeafFieldPaths(node.properties, path) : [path];
  });

/**
 * The fields a caller may filter on via `kuery`, derived from the filter mapping
 * so the contract stays in one place.
 */
export const ALLOWED_AGENTLESS_POLICY_FILTER_FIELDS = getLeafFieldPaths(
  AGENTLESS_POLICY_FILTER_MAPPINGS.properties
);

const ALLOWED_FILTER_FIELDS_LIST = ALLOWED_AGENTLESS_POLICY_FILTER_FIELDS.map(
  (field) => `\`${field}\``
).join(', ');

/**
 * Reuses the shared Fleet list envelope (`{ items, total, page, perPage }` with a
 * `maxSize` bound on `items`) so the agentless LIST response stays single-sourced
 * with every other Fleet list endpoint.
 */
export const AgentlessPolicyListResponseSchema = ListResponseSchema(AgentlessPolicySchema);

export const GetAgentlessPolicyRequestSchema = {
  params: schema.object({
    policyId: schema.string({
      meta: {
        description: 'The ID of the agentless policy to retrieve.',
      },
    }),
  }),
};

export const ListAgentlessPoliciesRequestSchema = {
  query: schema.object({
    // Paging defaults (page=1, perPage=20) are owned by the service layer
    // (`listAgentlessPolicies`), which is the single source of truth
    page: schema.maybe(schema.number({ meta: { description: 'Page number. Defaults to `1`.' } })),
    perPage: schema.maybe(
      schema.number({ meta: { description: 'Number of results per page. Defaults to `20`.' } })
    ),
    sortField: schema.maybe(
      schema.string({
        meta: { description: 'Field to sort results by. Defaults to `updated_at`.' },
      })
    ),
    sortOrder: schema.maybe(
      schema.oneOf([schema.literal('desc'), schema.literal('asc')], {
        meta: { description: 'Sort order, ascending or descending. Defaults to `desc`.' },
      })
    ),
    kuery: schema.maybe(
      schema.string({
        meta: {
          description: `A KQL query string to filter results. Filtering is restricted to the following fields: ${ALLOWED_FILTER_FIELDS_LIST}.`,
        },
        validate: (value: string) => {
          // The filter mapping above already uses unprefixed field names (e.g. `name`,
          // `package.name`), so the SO-type prefix normalization step must be skipped.
          const skipNormalization = true;
          const validationObj = validateKuery(
            value,
            [PACKAGE_POLICY_SAVED_OBJECT_TYPE, LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE],
            AGENTLESS_POLICY_FILTER_MAPPINGS,
            skipNormalization
          );
          if (validationObj?.error) {
            // Enumerate the allowed fields so the 400 is self-correcting; the list is
            // derived from the mapping above, never hardcoded.
            return `${validationObj.error}. Filtering is only allowed on the following fields: ${ALLOWED_FILTER_FIELDS_LIST}.`;
          }
        },
      })
    ),
  }),
};
