/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** LaunchDarkly flag that gates Fleet calls to the IaC Provisioner. Fallback is false. */
export const ENABLE_IAC_PROVISIONER_FLAG = 'fleet.enableIacProvisioner';
