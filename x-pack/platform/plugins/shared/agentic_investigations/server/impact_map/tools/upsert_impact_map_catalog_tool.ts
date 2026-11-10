/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z, lazySchema } from '@kbn/zod/v4';
import { createOtherResult } from '@kbn/agent-builder-server';
import {
  MAX_IMPACT_MAP_CATALOG_TYPES,
  UPSERT_IMPACT_MAP_CATALOG_TOOL_ID,
} from '../../../common/impact_map/constants';
import { STANDARD_METADATA_FIELDS } from '../../../common/impact_map/metadata';
import {
  impactMapEntityTypeSchema,
  impactMapIconSchema,
  impactMapRelationshipTypeSchema,
} from '../../../common/impact_map/impact_map';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { createInvestigationTool } from '../../investigation_attachments';
import type { ResolveUser } from '../../services/resolve_user';
import type { ImpactMapService } from '../services/impact_map_service';

const entityTypeSchema = impactMapEntityTypeSchema.extend({
  id: impactMapEntityTypeSchema.shape.id.describe(
    'Lowercase id, e.g. "service", "k8s_pod", "postgres_db", "external_api".'
  ),
  label: impactMapEntityTypeSchema.shape.label.describe(
    'Human name of the type, e.g. "Kubernetes pod".'
  ),
  kind: impactMapEntityTypeSchema.shape.kind.describe(
    'The shape. "service" draws a circle, only for application code you run (services, functions, front ends), with its APM agent logo. "infrastructure" draws a rounded square with the icon you choose, for everything else: databases, caches, queues, search clusters, external APIs, load balancers, Kubernetes objects, hosts, VMs, containers and cloud resources. Do not use "dependency"; it is read as "infrastructure".'
  ),
  metadata_fields: impactMapEntityTypeSchema.shape.metadata_fields.describe(
    'The metadata fields entities of this type usually carry, for example a Kubernetes deployment: k8s.cluster.name, k8s.namespace.name (both featured). Add fields beyond `standard_metadata_fields`; they are reused by later investigations.'
  ),
  icon: impactMapIconSchema
    .extend({
      agent_name: impactMapIconSchema.shape.agent_name.describe(
        'For a "service" type: the APM agent whose logo to draw, e.g. "nodejs", "java", "go", "python", "dotnet", "ruby", "php", "rum-js", "opentelemetry". Prefer this when the runtime is known.'
      ),
      eui_icon: impactMapIconSchema.shape.eui_icon.describe(
        'Required whenever there is no APM agent_name — every entity type must have a glyph, like a cloud architecture diagram. Prefer a technology or product logo: "logoElasticsearch", "logoElastic", "logoKibana", "logoPostgres", "logoMySQL", "logoMongodb", "logoRedis", "logoKafka", "logoRabbitmq", "logoNginx", "logoKubernetes" (always for Kubernetes objects), "logoDocker", "logoAWS", "logoGCP", "logoAzure", "logoGithub". Otherwise pick the closest shape: "database", "storage", "package" (queue/topic), "globe" (DNS or external API), "cluster" (deployments), "compute" (host, VM, allocator), "gear" (constructor, controller, operator), "merge" (proxy, load balancer, gateway), "mapMarker" (region or AZ), "shield" (firewall), "users" (team), "bolt" (disruption or fault), "sparkles" (investigation), "apps" (generic service with unknown runtime), "nested" (group).'
      ),
      span_type: impactMapIconSchema.shape.span_type.describe(
        'Older way to pick an icon; use eui_icon.'
      ),
      span_subtype: impactMapIconSchema.shape.span_subtype.describe(
        'Older way to pick an icon; use eui_icon.'
      ),
    })
    .optional()
    .describe(
      'How the type draws. Always set this: agent_name for a known APM runtime, or eui_icon for everything else. Never leave a type without an icon.'
    ),
});

const relationshipTypeSchema = impactMapRelationshipTypeSchema.extend({
  id: impactMapRelationshipTypeSchema.shape.id.describe('Lowercase id, e.g. "calls", "runs_on".'),
  label: impactMapRelationshipTypeSchema.shape.label.describe(
    'The edge label, in capitals, e.g. "CALLS", "RUNS_ON", "READS_FROM", "PUBLISHES_TO".'
  ),
});

export const upsertImpactMapCatalogToolSchema = lazySchema(() =>
  z.object({
    entity_types: z
      .array(entityTypeSchema)
      .max(MAX_IMPACT_MAP_CATALOG_TYPES)
      .optional()
      .describe('Entity types to add, or to replace by id.'),
    relationship_types: z
      .array(relationshipTypeSchema)
      .max(MAX_IMPACT_MAP_CATALOG_TYPES)
      .optional()
      .describe('Relationship types to add, or to replace by id.'),
  })
);

const DESCRIPTION =
  "Read the space's impact map catalog, and add types to it. The catalog holds the entity types (with how they draw and their icon) and relationship types every impact map in this space reuses, so investigations look consistent. " +
  'Call it with no arguments to read the catalog before `agentic_investigations.set_impact_map`, and reuse existing ids rather than inventing near-duplicates. ' +
  'Every entity type must carry an icon: APM `agent_name` for a known runtime, otherwise a specific `eui_icon` (product logo or the closest shape — never leave a type without one). ' +
  'Types sent here are added, or replace the stored type with the same id (metadata fields add up by key). Returns the whole catalog, and `standard_metadata_fields`: the common metadata keys (cloud, Kubernetes, host) to reuse on entities before inventing your own.';

/** `agentic_investigations.upsert_impact_map_catalog`: reads and extends the space catalog. */
export const createUpsertImpactMapCatalogTool = ({
  getImpactMapService,
  resolveUser,
  privileges,
  logger,
}: {
  getImpactMapService: () => ImpactMapService;
  resolveUser: ResolveUser;
  privileges: InvestigationsPrivilegesChecker;
  logger: Logger;
}) =>
  createInvestigationTool({
    id: UPSERT_IMPACT_MAP_CATALOG_TOOL_ID,
    description: DESCRIPTION,
    schema: upsertImpactMapCatalogToolSchema,
    annotations: {
      title: 'Read or Extend the Impact Map Catalog',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    assertPrivilege: (request) => privileges.assertCanManage(request),
    logger,
    handler: async (types, { context }) => {
      const user = await resolveUser(context.request);
      const catalog = await getImpactMapService()
        .getCatalogService()
        .upsert({ spaceId: context.spaceId, types, user });
      return {
        results: [
          createOtherResult({ ...catalog, standard_metadata_fields: STANDARD_METADATA_FIELDS }),
        ],
      };
    },
  });
