/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const AttackDiscoveryExpandedAlertSchema = schema.object({
  _id: schema.string(),
  _index: schema.string(),
  kibana: schema.object({
    alert: schema.object({
      attack_discovery: schema.object({
        alert_ids: schema.arrayOf(schema.string()),
        details_markdown: schema.string(),
        entity_summary_markdown: schema.maybe(schema.string()),
        mitre_attack_tactics: schema.maybe(schema.arrayOf(schema.string())),
        replacements: schema.maybe(
          schema.arrayOf(schema.object({ value: schema.string(), uuid: schema.string() }))
        ),
        summary_markdown: schema.string(),
        title: schema.string(),
      }),
      rule: schema.object({
        parameters: schema.object({
          alertsIndexPattern: schema.string(),
        }),
        rule_type_id: schema.string(),
      }),
    }),
  }),
});

export const AttackDiscoveryExpandedAlertsSchema = schema.arrayOf(
  AttackDiscoveryExpandedAlertSchema
);
