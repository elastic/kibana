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

/** LaunchDarkly flag that gates creation and management of OTLP outputs. Fallback is false. */
export const ENABLE_OTLP_OUTPUT_FLAG = 'fleet.enableOtlpOutput';

/**
 * LaunchDarkly flag that makes Fleet also deploy and assign agents to a `<policy id>#sentinel` copy of every
 * agent policy, so version-specific policy code paths are exercised by default. Fallback is false.
 */
export const ENABLE_SENTINEL_POLICY_VERSION_FLAG = 'fleet.enableSentinelPolicyVersion';
