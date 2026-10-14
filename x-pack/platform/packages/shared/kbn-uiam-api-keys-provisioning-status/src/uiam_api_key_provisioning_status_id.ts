/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiamApiKeyProvisioningEntityType } from './uiam_api_key_provisioning_status';

/**
 * Builds the `uiam_api_keys_provisioning_status` saved object id for an entity, namespaced by
 * entity type.
 *
 * A rule and its execution task share the same uuid (a rule's `scheduledTaskId` is the rule id),
 * so a bare entity id makes the Alerting and Task Manager provisioning tasks write to the same
 * document and perpetually overwrite each other. `attributes.entityId` keeps the bare id: both
 * exclude filters select on attributes, not on the document id.
 */
export const buildUiamApiKeyProvisioningStatusId = (
  entityType: UiamApiKeyProvisioningEntityType,
  entityId: string
): string => `${entityType}:${entityId}`;
