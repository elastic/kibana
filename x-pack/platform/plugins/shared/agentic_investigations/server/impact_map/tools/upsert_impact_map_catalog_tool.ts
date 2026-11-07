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
    'The shape, by what the thing fundamentally is. "service" draws a circle, for application code you run (services, functions, front ends). "dependency" draws a diamond, for what services call (databases, queues, caches, external APIs). "infrastructure" draws a rounded square, for what runs and hosts them (Kubernetes deployments, pods and nodes, hosts, VMs, containers, cloud resources, load balancers).'
  ),
  icon: impactMapIconSchema
    .extend({
      agent_name: impactMapIconSchema.shape.agent_name.describe(
        'For a "service" type: the APM agent whose logo to draw, e.g. "nodejs", "java", "go", "python", "dotnet", "ruby", "php", "rum-js", "opentelemetry".'
      ),
      eui_icon: impactMapIconSchema.shape.eui_icon.describe(
        'For a type with no APM agent: an EUI icon name. Always "logoKubernetes" for Kubernetes objects (deployment, pod, node, statefulset, daemonset, namespace), "logoDocker" for containers, "logoAWS", "logoGcp" or "logoAzure" for cloud resources.'
      ),
      span_type: impactMapIconSchema.shape.span_type.describe(
        'For a "dependency" type: the span type whose icon to draw, e.g. "db", "messaging", "cache", "external", "storage".'
      ),
      span_subtype: impactMapIconSchema.shape.span_subtype.describe(
        'For a "dependency" type: the technology, e.g. "postgresql", "mysql", "elasticsearch", "redis", "kafka", "rabbitmq", "s3", "http", "grpc".'
      ),
    })
    .optional(),
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
  'Types sent here are added, or replace the stored type with the same id. Returns the whole catalog.';

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
      return { results: [createOtherResult(catalog)] };
    },
  });
