/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This path is duplicated as a hardcoded string in packages that cannot import from this plugin
// without causing circular dependencies. If you change this value, also update:
//   - x-pack/platform/plugins/shared/alerting_v2/public/constants.ts
//   - x-pack/platform/packages/shared/response-ops/alerting-v2-episodes-ui/hooks/use_alerting_rules_index.ts
//   - x-pack/platform/packages/shared/response-ops/alerting-v2-rule-form/form/hooks/use_create_rule.ts
//   - x-pack/platform/packages/shared/response-ops/alerting-v2-rule-form/form/hooks/use_update_rule.ts
//   - x-pack/platform/plugins/shared/alerting_v2/test/scout_alerting_v2/api/fixtures/constants.ts
export const ALERTING_V2_RULE_API_PATH = '/api/alerting/v2/rules' as const;
export const INTERNAL_ALERTING_V2_ALERT_API_PATH = '/internal/alerting/v2/alerts' as const;
export const INTERNAL_ALERTING_V2_NOTIFICATION_POLICY_API_PATH =
  '/internal/alerting/v2/notification_policies' as const;
