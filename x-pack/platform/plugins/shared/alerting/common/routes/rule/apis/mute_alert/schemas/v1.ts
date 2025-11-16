/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { schema } from '@kbn/config-schema';

export const muteAlertRequestBodyExamples = () => path.join(__dirname, 'examples_mute_alert.yaml');

export const muteAlertParamsSchema = schema.object({
  rule_id: schema.string({
    meta: {
      description: 'The identifier for the rule.',
    },
  }),
  alert_id: schema.string({
    meta: {
      description: 'The identifier for the alert.',
    },
  }),
});

export const muteAlertBodySchema = schema.object({
  validate_alerts_existence: schema.maybe(
    schema.boolean({
      defaultValue: true,
      meta: {
        description: 'Whether to validate the existence of the alert.',
      },
    })
  ),
});
