/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const WORKFLOW_SECRETS_ROUTE = '/internal/workflows/secrets';
export const WORKFLOW_SECRET_ROUTE = `${WORKFLOW_SECRETS_ROUTE}/{name}`;
/** Checks that a stored secret can be read, without returning its value. */
export const WORKFLOW_SECRET_TEST_ROUTE = `${WORKFLOW_SECRET_ROUTE}/_test`;

// Outside of `/secrets/`, so that it can never clash with the name of a secret.
export const WORKFLOW_SECRET_CONNECTORS_ROUTE = '/internal/workflows/secret_connectors';
