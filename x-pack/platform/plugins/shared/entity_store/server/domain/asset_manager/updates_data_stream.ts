/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEntityIndexPattern,
  getLegacySecurityEntityIndexPattern,
  ENTITY_SCHEMA_VERSION_V2,
  ENTITY_UPDATES,
  ENTITY_BASE_PREFIX,
} from '../../../common/domain/entity_index';

export const getUpdatesEntitiesDataStreamName = (namespace: string) =>
  getEntityIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V2,
    dataset: ENTITY_UPDATES,
    namespace,
  });

/** @deprecated Legacy Security-scoped updates stream; used only until migration deletes it. */
export const getLegacySecurityUpdatesEntitiesDataStreamName = (namespace: string) =>
  getLegacySecurityEntityIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V2,
    dataset: ENTITY_UPDATES,
    namespace,
  });

/** @deprecated Neutral updates index template created by pre-PR installs; used only for uninstall cleanup. */
export const getUpdatesIndexTemplateId = (namespace: string) =>
  `.${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V2}_${ENTITY_UPDATES}_${namespace}_index_template` as const;

/** @deprecated Legacy Security-scoped index template; used only for uninstall cleanup. */
export const getLegacySecurityUpdatesIndexTemplateId = (namespace: string) =>
  `.${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V2}_${ENTITY_UPDATES}_security_${namespace}_index_template` as const;
