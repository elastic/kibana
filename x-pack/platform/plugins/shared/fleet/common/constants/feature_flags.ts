/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** LaunchDarkly flag that gates Fleet calls to the IaC Provisioner. Fallback is false. */
export const ENABLE_IAC_PROVISIONER_FLAG = 'fleet.enableIacProvisioner';

/**
 * LaunchDarkly flag that lets a launched AWS stack report its role back, so Kibana creates the
 * identity without the user pasting ARNs. Needs the IaC Provisioner flag too. Fallback is false.
 */
export const ENABLE_AWS_STACK_CALLBACK_FLAG = 'fleet.enableAwsStackCallback';

/** LaunchDarkly flag that gates the Restart Agent action in the Fleet UI. Fallback is false. */
export const ENABLE_RESTART_AGENT_ACTION_FLAG = 'fleet.enableRestartAgentAction';

/** LaunchDarkly flag that gates creation and management of OTLP outputs. Fallback is false. */
export const ENABLE_OTLP_OUTPUT_FLAG = 'fleet.enableOtlpOutput';
