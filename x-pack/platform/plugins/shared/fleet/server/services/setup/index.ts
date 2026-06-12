/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { upgradePackageInstallVersion } from './upgrade_package_install_version';
export { upgradeAgentPolicySchemaVersion } from './upgrade_agent_policy_schema_version';
export { ensureAgentPoliciesFleetServerKeysAndPolicies } from './fleet_server_policies_enrollment_keys';
export { updateDeprecatedComponentTemplates } from './update_deprecated_component_templates';
export { createOrUpdateFleetSyncedIntegrationsIndex } from './fleet_synced_integrations';
