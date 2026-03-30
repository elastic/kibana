/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationEntityClass } from './schemas';

/**
 * Maps known ECS (and Kibana-specific) field paths to their canonical
 * anonymization entity class. Used to auto-suggest entity classes in the UI
 * when a user is building a new anonymization profile, and to populate
 * default field rules when profiles are automatically initialized.
 *
 * Fields not present in this map should be left to the user to classify.
 */
export const ECS_ENTITY_CLASS_MAP: Readonly<Record<string, AnonymizationEntityClass>> = {
  // IP addresses
  'source.ip': 'IP',
  'destination.ip': 'IP',
  'host.ip': 'IP',
  'client.ip': 'IP',
  'server.ip': 'IP',
  'network.forwarded_ip': 'IP',
  'related.ip': 'IP',

  // Host / machine identifiers
  'host.name': 'HOST_NAME',
  'host.hostname': 'HOST_NAME',

  // User identifiers
  'user.name': 'USER_NAME',
  'user.full_name': 'USER_NAME',
  'user.target.name': 'USER_NAME',
  'user.effective.name': 'USER_NAME',
  'user.display_name': 'USER_NAME',

  // URLs
  'url.full': 'URL',
  'url.original': 'URL',

  // Email addresses
  'user.email': 'EMAIL',

  // Cloud account
  'cloud.account.id': 'CLOUD_ACCOUNT',
  'cloud.account.name': 'CLOUD_ACCOUNT',

  // Generic named entity (Kibana-specific ECS extension)
  'entity.name': 'ENTITY_NAME',

  // Resource (Kibana-specific ECS extension)
  'resource.name': 'RESOURCE_NAME',
  'resource.id': 'RESOURCE_ID',

  // Organizations → CoNLL-03 ORG class
  'organization.name': 'ORG',
  'cloud.provider': 'ORG',

  // People → CoNLL-03 PER class
  'user.changes.full_name': 'PER',
  'related.user': 'PER',

  // Locations → CoNLL-03 LOC class
  'geo.city_name': 'LOC',
  'geo.country_name': 'LOC',
  'geo.region_name': 'LOC',
};

/**
 * Returns the suggested `AnonymizationEntityClass` for a given ECS field path,
 * or `undefined` if no mapping is known for that field.
 *
 * Intended for two use cases:
 *  1. UI suggestions — auto-populate the entity class picker when a user adds a
 *     field to a profile.
 *  2. Programmatic profile initialization — populate `entityClass` on default
 *     field rules without hard-coding the mapping in the consumer.
 *
 * @example
 * suggestEntityClassForField('host.name')         // → 'HOST_NAME'
 * suggestEntityClassForField('source.ip')         // → 'IP'
 * suggestEntityClassForField('kibana.alert.rule.name') // → undefined
 */
export const suggestEntityClassForField = (
  fieldPath: string
): AnonymizationEntityClass | undefined => ECS_ENTITY_CLASS_MAP[fieldPath];
