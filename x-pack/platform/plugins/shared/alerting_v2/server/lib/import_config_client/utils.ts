/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImportResponse } from '@kbn/alerting-v2-schemas';
import type { Actor } from '../services/user_service/user_service';
import type { ImportConfigSavedObjectAttributes } from '../../saved_objects';
import type { CreateImportConfigParams } from './types';

export const buildCreateImportConfigAttributes = ({
  params,
  actor,
  now,
}: {
  params: CreateImportConfigParams;
  actor: Actor | null;
  now: string;
}): ImportConfigSavedObjectAttributes => {
  const { data, kind = 'custom', connectorTypeId, source, connectorId, workflowId } = params;

  return {
    name: data.name,
    ...(data.description !== undefined ? { description: data.description } : {}),
    kind,
    enabled: true,
    source,
    connector_id: connectorId,
    ...(connectorTypeId !== undefined ? { connector_type_id: connectorTypeId } : {}),
    workflow_id: workflowId,
    tags: data.tags ?? [],
    routing_tags: data.routing_tags ?? [],
    ...(data.default_severity !== undefined ? { default_severity: data.default_severity } : {}),
    ...(data.owner !== undefined ? { owner: data.owner } : {}),
    ...(data.external_config_url !== undefined
      ? { external_config_url: data.external_config_url }
      : {}),
    ...(data.fingerprint_field !== undefined ? { fingerprint_field: data.fingerprint_field } : {}),
    created_by: actor,
    updated_by: actor,
    created_at: now,
    updated_at: now,
  };
};

export const transformImportConfigSoAttributesToApiResponse = ({
  id,
  attributes,
}: {
  id: string;
  attributes: ImportConfigSavedObjectAttributes;
}): ImportResponse => ({
  id,
  name: attributes.name,
  ...(attributes.description !== undefined ? { description: attributes.description } : {}),
  kind: attributes.kind,
  enabled: attributes.enabled,
  source: attributes.source,
  connector_id: attributes.connector_id,
  ...(attributes.connector_type_id !== undefined
    ? { connector_type_id: attributes.connector_type_id }
    : {}),
  workflow_id: attributes.workflow_id,
  tags: attributes.tags,
  routing_tags: attributes.routing_tags,
  ...(attributes.default_severity !== undefined
    ? { default_severity: attributes.default_severity }
    : {}),
  ...(attributes.owner !== undefined ? { owner: attributes.owner } : {}),
  ...(attributes.external_config_url !== undefined
    ? { external_config_url: attributes.external_config_url }
    : {}),
  ...(attributes.fingerprint_field !== undefined
    ? { fingerprint_field: attributes.fingerprint_field }
    : {}),
  created_by: attributes.created_by,
  created_at: attributes.created_at,
  updated_by: attributes.updated_by,
  updated_at: attributes.updated_at,
});

const RESERVED_SOURCE_PREFIX = 'elastic';

/** Default `source` of an import: a slug of its name that never starts with the reserved prefix. */
export const toImportSource = (name: string): string => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  const source = slug === '' ? 'import' : slug;
  return source.startsWith(RESERVED_SOURCE_PREFIX) ? `custom-${source}` : source;
};
