/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import AWS_ROLE_BLAST_RADIUS_YAML from './aws_role_blast_radius.yaml';
import ENDPOINT_SHARED_INDICATOR_SPREAD_YAML from './endpoint_shared_indicator_spread.yaml';
import OKTA_USER_TO_AWS_RESOURCES_YAML from './okta_user_to_aws_resources.yaml';
import OKTA_USER_BLAST_RADIUS_IAG_YAML from './okta_user_blast_radius_iag.yaml';
import AD_ACCOUNT_BLAST_RADIUS_IAG_YAML from './ad_account_blast_radius_iag.yaml';
import DOMAIN_ADMINS_REACH_YAML from './domain_admins_reach.yaml';
import CROWN_JEWEL_BUCKET_REACH_YAML from './crown_jewel_bucket_reach.yaml';
import {
  buildEntityGraphTraversalPlan,
  type EntityGraphTraversalLimitOverrides,
  type EntityGraphTraversalPlan,
  type EntityGraphTraversalScenario,
  entityGraphTraversalScenarioSchema,
} from './scenario_schema';

export {
  ENTITY_GRAPH_TRAVERSAL_DEFAULT_LIMITS,
  ENTITY_GRAPH_TRAVERSAL_HARD_LIMITS,
  ENTITY_GRAPH_TRAVERSAL_DIRECTIONS,
  ENTITY_GRAPH_TRAVERSAL_NODE_ID_FIELD,
  entityGraphTraversalRelationshipField,
  entityGraphTraversalRelationshipKey,
  ESQL_FIELD_NAME_PATTERN,
  LOOKBACK_PATTERN,
  MAX_HOP_SPECS_PER_SCENARIO,
  MAX_PAYLOAD_FIELDS_PER_HOP,
  MAX_RELATIONSHIPS_PER_HOP,
  RELATIONSHIP_KEY_PATTERN,
  buildEntityGraphTraversalPlan,
  entityGraphTraversalHopSchema,
  entityGraphTraversalLimitOverridesSchema,
  entityGraphTraversalLimitsSchema,
  entityGraphTraversalScenarioSchema,
  entityGraphTraversalStopConditionSchema,
  expandEntityGraphTraversalHops,
  resolveEntityGraphTraversalLimits,
} from './scenario_schema';
export type {
  EntityGraphTraversalExpandedHop,
  EntityGraphTraversalHopSpec,
  EntityGraphTraversalDirection,
  EntityGraphTraversalLimitOverrides,
  EntityGraphTraversalLimits,
  EntityGraphTraversalPlan,
  EntityGraphTraversalScenario,
  EntityGraphTraversalStopCondition,
} from './scenario_schema';

/**
 * A scenario as shipped: its id and the YAML source. One entry per file in this folder.
 */
export interface EntityGraphTraversalScenarioDefinition {
  id: string;
  yaml: string;
}

export const OKTA_USER_TO_AWS_RESOURCES_SCENARIO_ID = 'okta-user-to-aws-resources';
export const AWS_ROLE_BLAST_RADIUS_SCENARIO_ID = 'aws-role-blast-radius';
export const ENDPOINT_SHARED_INDICATOR_SPREAD_SCENARIO_ID = 'endpoint-shared-indicator-spread';
/** Scenarios over the relationships the identity access graph generator writes. */
export const OKTA_USER_BLAST_RADIUS_IAG_SCENARIO_ID = 'okta-user-blast-radius-iag';
export const AD_ACCOUNT_BLAST_RADIUS_IAG_SCENARIO_ID = 'ad-account-blast-radius-iag';
export const DOMAIN_ADMINS_REACH_SCENARIO_ID = 'domain-admins-reach';
export const CROWN_JEWEL_BUCKET_REACH_SCENARIO_ID = 'crown-jewel-bucket-reach';

export const entityGraphTraversalScenarioDefinitions = [
  { id: OKTA_USER_TO_AWS_RESOURCES_SCENARIO_ID, yaml: OKTA_USER_TO_AWS_RESOURCES_YAML },
  { id: AWS_ROLE_BLAST_RADIUS_SCENARIO_ID, yaml: AWS_ROLE_BLAST_RADIUS_YAML },
  { id: ENDPOINT_SHARED_INDICATOR_SPREAD_SCENARIO_ID, yaml: ENDPOINT_SHARED_INDICATOR_SPREAD_YAML },
  { id: OKTA_USER_BLAST_RADIUS_IAG_SCENARIO_ID, yaml: OKTA_USER_BLAST_RADIUS_IAG_YAML },
  { id: AD_ACCOUNT_BLAST_RADIUS_IAG_SCENARIO_ID, yaml: AD_ACCOUNT_BLAST_RADIUS_IAG_YAML },
  { id: DOMAIN_ADMINS_REACH_SCENARIO_ID, yaml: DOMAIN_ADMINS_REACH_YAML },
  { id: CROWN_JEWEL_BUCKET_REACH_SCENARIO_ID, yaml: CROWN_JEWEL_BUCKET_REACH_YAML },
] as const satisfies readonly EntityGraphTraversalScenarioDefinition[];

export type EntityGraphTraversalScenarioId =
  (typeof entityGraphTraversalScenarioDefinitions)[number]['id'];

export const listEntityGraphTraversalScenarioIds = (): string[] =>
  entityGraphTraversalScenarioDefinitions.map((definition) => definition.id);

/**
 * Parse and validate a scenario's YAML. Throws a `ZodError` when the file does not match the
 * schema, so a malformed scenario fails loudly at load time rather than mid-traversal.
 */
export const parseEntityGraphTraversalScenario = (yaml: string): EntityGraphTraversalScenario =>
  entityGraphTraversalScenarioSchema.parse(parse(yaml));

export const getEntityGraphTraversalScenario = (
  id: string
): EntityGraphTraversalScenario | undefined => {
  const definition = entityGraphTraversalScenarioDefinitions.find((d) => d.id === id);
  if (!definition) return undefined;
  const scenario = parseEntityGraphTraversalScenario(definition.yaml);
  if (scenario.id !== id) {
    throw new Error(
      `Entity graph traversal scenario "${id}" declares a different id in its YAML ("${scenario.id}")`
    );
  }
  return scenario;
};

/**
 * Load a scenario by id and build the executable plan for a run.
 */
export const loadEntityGraphTraversalPlan = (
  id: string,
  overrides?: EntityGraphTraversalLimitOverrides
): EntityGraphTraversalPlan | undefined => {
  const scenario = getEntityGraphTraversalScenario(id);
  return scenario ? buildEntityGraphTraversalPlan(scenario, overrides) : undefined;
};
