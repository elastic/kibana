/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** LaunchDarkly flag that gates Fleet calls to the IaC Provisioner. Fallback is false. */
export const ENABLE_IAC_PROVISIONER_FLAG = 'fleet.enableIacProvisioner';

/** LaunchDarkly flag that gates the Restart Agent action in the Fleet UI. Fallback is false. */
export const ENABLE_RESTART_AGENT_ACTION_FLAG = 'fleet.enableRestartAgentAction';

/** Feature flag that gates the OAuth2 authentication method of the Kafka output. Fallback is false. */
export const ENABLE_KAFKA_OAUTH2_AUTH_FLAG = 'fleet.enableKafkaOAuth2Auth';
