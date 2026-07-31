/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlViewDefinition } from '../../lib/services/resource_service/esql_view_initializer';

/**
 * Classic (v1) alerts-as-data projected into episode-shaped columns for the
 * unified episodes list (and safe to open in Discover).
 *
 * KEEP is intentional: Discover should not dump the full AAD document. Authz /
 * space fields are retained so the list route can filter before its own KEEP:
 * `kibana.alert.rule.rule_type_id`, `kibana.alert.rule.consumer`, `kibana.space_ids`.
 *
 * Name must match kibana_system's create_view grant on `$.alert*`
 * (ReservedRolesStore.ALERTING_V2_ALERT_VIEWS in Elasticsearch).
 *
 * Do not SORT here — outer list queries may use QSTR after FROM, which ES|QL
 * forbids after SORT.
 */
export const CLASSIC_ALERTS_VIEW_NAME = '$.alerts-v1';

export const getClassicAlertsViewDefinition = (): EsqlViewDefinition => ({
  key: 'view:alerts-v1',
  name: CLASSIC_ALERTS_VIEW_NAME,
  query: `FROM .alerts-observability.*, .alerts-stack.*
| EVAL
    \`episode.id\` = \`kibana.alert.uuid\`,
    \`episode.status\` = CASE(\`kibana.alert.status\` == "active", "active", "inactive"),
    \`rule.id\` = \`kibana.alert.rule.uuid\`,
    group_hash = \`kibana.alert.uuid\`,
    first_timestamp = COALESCE(\`kibana.alert.start\`, @timestamp),
    last_timestamp = COALESCE(\`kibana.alert.end\`, @timestamp),
    duration = DATE_DIFF("ms", first_timestamp, last_timestamp),
    triggered_at = CASE(\`kibana.alert.status\` == "active", \`kibana.alert.start\`, NULL),
    severity = \`kibana.alert.severity\`,
    last_tags = \`kibana.alert.rule.tags\`,
    _is_v1 = true,
    _v1_rule_name = \`kibana.alert.rule.name\`
| WHERE \`kibana.alert.status\` != "untracked"
| KEEP @timestamp, \`episode.id\`, \`episode.status\`, \`rule.id\`, group_hash, first_timestamp, last_timestamp, duration, triggered_at, severity, last_tags, _is_v1, _v1_rule_name, \`kibana.alert.rule.rule_type_id\`, \`kibana.alert.rule.consumer\`, \`kibana.space_ids\``,
});
