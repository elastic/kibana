/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INGEST_SAVED_OBJECT_INDEX = '.kibana_ingest';

export const FLEET_SETUP_LOCK_TYPE = 'fleet-setup-lock';

export const CLOUD_CONNECTOR_SAVED_OBJECT_TYPE = 'fleet-cloud-connector';

export const CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE = 'fleet-cloud-onboarding-deployment';

/**
 * Longest integration name an onboarding deployment stores. A policy name is the integration name
 * plus `-<suffix>` of at most 88 characters, and Fleet limits policy names to 255, so a longer
 * name could be cut and two policies of one deploy could end up with the same name.
 */
export const CLOUD_ONBOARDING_INTEGRATION_NAME_MAX_LENGTH = 160;
