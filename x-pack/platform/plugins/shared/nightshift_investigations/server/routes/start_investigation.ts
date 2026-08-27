/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { MissingAlertContextError } from '../client/investigations_client';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

const MAX_ALERTS_PER_INVESTIGATION = 20;

// A rule type writes one evaluation entry per metric or criterion, so this bounds a hostile
// array rather than a realistic rule.
const MAX_EVALUATION_ENTRIES = 20;

const alertSnapshotSchema = z.object({
  id: z.string().min(1).max(500),
  rule_id: z.string().min(1).max(500),
  rule_name: z.string().min(1).max(500),
  rule_type_id: z.string().min(1).max(500),
  rule_category: z.string().min(1).max(500),
  reason: z.string().min(1).max(5000),
  status: z.string().min(1).max(100),
  start: z.string().max(100).datetime({ offset: true }),
  flapping: z.boolean(),
  url: z.string().max(2000).optional(),
  rule_tags: z.array(z.string().max(500)).max(50).optional(),
  // Entity grouping and the rule condition come from the legacy experimental field map, which
  // rule types opt into, so all four are optional rather than merely nullable.
  grouping: z.record(z.string().max(128), z.unknown()).optional(),
  group: z
    .array(z.object({ field: z.string().max(500), value: z.string().max(1000) }))
    .max(50)
    .optional(),
  evaluation: z
    .object({
      // Every shape here is genuinely written by some rule type: scaled_float in the experimental
      // field map, keyword for `.es-query`, whose executor writes a stringified value, and arrays
      // for the custom-threshold rule type, which writes one entry per metric and per criterion.
      value: z
        .union([
          z.number(),
          z.string().max(500),
          z.array(z.union([z.number(), z.string().max(500)])).max(MAX_EVALUATION_ENTRIES),
        ])
        .optional(),
      threshold: z.union([z.number(), z.array(z.number()).max(MAX_EVALUATION_ENTRIES)]).optional(),
    })
    .optional(),
  rule_parameters: z.record(z.string().max(128), z.unknown()).optional(),
  index_pattern: z.string().max(1000).optional(),
});

const freeFormContextSchema = z
  .record(z.string().max(128), z.unknown())
  .refine((v) => Object.keys(v).length <= 50, { message: 'context exceeds 50 key limit' });

// Strict, so that an alert investigation carries alert data and nothing else. In particular a
// caller cannot pass the `event_uuid` the workflow's attach steps read and have the results land
// on a significant event: one investigation has one trigger today, and an alert is not a
// significant event. Rejecting beats silently dropping the key, which would leave the caller
// believing the attach happened. If a single investigation ever needs several triggers, that is a
// deliberate change to the subject shape, not an extra key smuggled through the context.
const alertContextSchema = z
  .object({
    alerts: z.array(alertSnapshotSchema).min(1).max(MAX_ALERTS_PER_INVESTIGATION),
  })
  .strict();

export const startInvestigationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/investigations',
  options: {
    access: 'internal',
    summary: 'Start an investigation',
    description: 'Triggers an investigation workflow for a given subject.',
  },
  security: {
    // agentBuilder:write is used as a proxy for "this user is authorized to spend AI tokens."
    // The investigation workflow itself creates the Agent Builder conversation — the calling user
    // does not create it directly — so this is not a strict AB permission requirement. We use
    // agentBuilder:write because it is the best available signal that a user has been granted
    // access to AI-resource-consuming features in this deployment. When conversation templates
    // land with their own privilege model, this should be revisited.
    authz: {
      requiredPrivileges: ['agentBuilder:write'],
    },
  },
  params: z.object({
    // A union rather than one object with a loose `context`, so that an alert investigation
    // cannot be started without the alert data it is supposed to reason about. zod's
    // discriminatedUnion needs the discriminator at the top level, and ours is nested under
    // `subject`, hence a plain union.
    body: z.union([
      z.object({
        subject: z.object({
          type: z.literal('alert'),
          id: z.string().min(1).max(500),
        }),
        concurrency_key: z.string().max(500).optional(),
        context: alertContextSchema,
      }),
      z.object({
        subject: z.object({
          type: z.literal('significant_event'),
          id: z.string().min(1).max(500),
        }),
        concurrency_key: z.string().max(500).optional(),
        context: freeFormContextSchema.optional(),
      }),
    ]),
  }),
  handler: async ({ request, params, getInvestigationsClient }) => {
    const client = getInvestigationsClient(request);
    try {
      return await client.start(params.body);
    } catch (err) {
      // Unreachable through this route while the schema above agrees with the client's check, but
      // the two are separate declarations and a 500 would be the wrong answer if they diverge.
      if (err instanceof MissingAlertContextError) {
        throw badRequest(err.message);
      }
      throw err;
    }
  },
});
