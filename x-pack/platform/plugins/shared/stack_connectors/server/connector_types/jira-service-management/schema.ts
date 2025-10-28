/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { isEmpty } from 'lodash';
import * as i18n from './translations';

export const ConfigSchema = z
  .object({
    apiUrl: z.string(),
  })
  .strict();

export const SecretsSchema = z
  .object({
    apiKey: z.string(),
  })
  .strict();

const SuccessfulResponse = z
  .object({
    took: z.coerce.number(),
    requestId: z.string(),
    result: z.string(),
  })
  .passthrough();

export const FailureResponse = z
  .object({
    code: z.coerce.number().optional(),
    message: z.string().optional(),
    result: z.string().optional(),
    errors: z.array(z.object({ title: z.string(), code: z.string() }).strict()).optional(),
    took: z.coerce.number().optional(),
    requestId: z.string().optional(),
  })
  .passthrough();

export const Response = z.union([SuccessfulResponse, FailureResponse]);

const responderTypes = z.enum(['team', 'user', 'escalation', 'schedule']);

/**
 * For more information on the JiraServiceManagement create alert schema see: https://developer.atlassian.com/cloud/jira/service-desk-ops/rest/v1/api-group-integration-events/#api-jsm-ops-integration-v2-alerts-post
 */
export const CreateAlertParamsSchema = z
  .object({
    message: z
      .string()
      .min(1)
      .max(130)
      .superRefine((message, ctx) => {
        if (isEmpty(message.trim())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: i18n.MESSAGE_NON_EMPTY,
          });
        }
      }),
    /**
     * The max length here should be 512 according to JiraServiceManagement's docs but we will sha256 hash the alias if it is longer than 512
     * so we'll not impose a limit on the schema otherwise it'll get rejected prematurely.
     */
    alias: z.string().optional(),
    description: z.string().max(15000).optional(),
    responders: z
      .array(z.object({ id: z.string(), type: responderTypes }).strict())
      .max(50)
      .optional(),
    visibleTo: z
      .array(
        z.union([
          z
            .object({
              id: z.string(),
              type: z.literal('team'),
            })
            .strict(),
          z
            .object({
              id: z.string(),
              type: z.literal('user'),
            })
            .strict(),
        ])
      )
      .max(50)
      .optional(),
    actions: z.array(z.string().max(50)).max(10).optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    /**
     * The validation requirement here is that the total characters between the key and value do not exceed 8000. JiraServiceManagement
     * will truncate the value if it would exceed the 8000 but it doesn't throw an error. Because of this I'm intentionally
     * not validating the length of the keys and values here.
     */
    details: z.record(z.string(), z.string()).optional(),
    entity: z.string().max(512).optional(),
    source: z.string().max(100).optional(),
    priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']).optional(),
    note: z.string().max(25000).optional(),
    user: z.string().max(100).optional(),
  })
  .strict();

export const CloseAlertParamsSchema = z
  .object({
    alias: z.string(),
    user: z.string().max(100).optional(),
    source: z.string().max(100).optional(),
    note: z.string().max(25000).optional(),
  })
  .strict();
