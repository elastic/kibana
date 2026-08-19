/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const EXAMPLE_WEBHOOK_CONNECTOR_TYPE_ID = '.exampleWebhook' as const;

export const EXAMPLE_WEBHOOK_RECEIVED_EVENT_KEY = 'received' as const;

/** Stable in-memory instance id (`connector-id` in workflow YAML). */
export const EXAMPLE_WEBHOOK_INSTANCE_ID = 'sales-ingress' as const;

export const EXAMPLE_WEBHOOK_INSTANCE_NAME = 'sales-ingress' as const;
