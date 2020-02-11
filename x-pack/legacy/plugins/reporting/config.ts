/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BROWSER_TYPE } from './common/constants';
// @ts-ignore untyped module
import { config as appConfig } from './server/config/config';
import { getDefaultChromiumSandboxDisabled } from './server/browsers';

export async function config(Joi: any) {
  return Joi.object({
    enabled: Joi.boolean().default(true),
    kibanaServer: Joi.object({
      protocol: Joi.string().valid(['http', 'https']),
      hostname: Joi.string().invalid('0'),
      port: Joi.number().integer(),
    }).default(),
    queue: Joi.object({
      indexInterval: Joi.string().default('week'),
      pollEnabled: Joi.boolean().default(true),
      pollInterval: Joi.number()
        .integer()
        .default(3000),
      pollIntervalErrorMultiplier: Joi.number()
        .integer()
        .default(10),
      timeout: Joi.number()
        .integer()
        .default(120000),
    }).default(),
    capture: Joi.object({
      networkPolicy: Joi.object({
        enabled: Joi.boolean().default(true),
        rules: Joi.array()
          .items(
            Joi.object({
              allow: Joi.boolean().required(),
              protocol: Joi.string(),
              host: Joi.string(),
            })
          )
          .default([
            { allow: true, protocol: 'http:' },
            { allow: true, protocol: 'https:' },
            { allow: true, protocol: 'ws:' },
            { allow: true, protocol: 'wss:' },
            { allow: true, protocol: 'data:' },
            { allow: false }, // Default action is to deny!
          ]),
      }).default(),
      zoom: Joi.number()
        .integer()
        .default(2),
      viewport: Joi.object({
        width: Joi.number()
          .integer()
          .default(1950),
        height: Joi.number()
          .integer()
          .default(1200),
      }).default(),
      timeout: Joi.number()
        .integer()
        .default(20000), // deprecated
      loadDelay: Joi.number()
        .integer()
        .default(3000),
      settleTime: Joi.number()
        .integer()
        .default(1000), // deprecated
      concurrency: Joi.number()
        .integer()
        .default(appConfig.concurrency), // deprecated
      browser: Joi.object({
        type: Joi.any()
          .valid(BROWSER_TYPE)
          .default(BROWSER_TYPE),
        autoDownload: Joi.boolean().when('$dist', {
          is: true,
          then: Joi.default(false),
          otherwise: Joi.default(true),
        }),
        chromium: Joi.object({
          inspect: Joi.boolean()
            .when('$dev', {
              is: false,
              then: Joi.valid(false),
              else: Joi.default(false),
            })
            .default(),
          disableSandbox: Joi.boolean().default(await getDefaultChromiumSandboxDisabled()),
          proxy: Joi.object({
            enabled: Joi.boolean().default(false),
            server: Joi.string()
              .uri({ scheme: ['http', 'https'] })
              .when('enabled', {
                is: Joi.valid(false),
                then: Joi.valid(null),
                else: Joi.required(),
              }),
            bypass: Joi.array()
              .items(Joi.string().regex(/^[^\s]+$/))
              .when('enabled', {
                is: Joi.valid(false),
                then: Joi.valid(null),
                else: Joi.default([]),
              }),
          }).default(),
          maxScreenshotDimension: Joi.number()
            .integer()
            .default(1950),
        }).default(),
      }).default(),
      maxAttempts: Joi.number()
        .integer()
        .greater(0)
        .when('$dist', {
          is: true,
          then: Joi.default(3),
          otherwise: Joi.default(1),
        })
        .default(),
    }).default(),
    csv: Joi.object({
      checkForFormulas: Joi.boolean().default(true),
      enablePanelActionDownload: Joi.boolean().default(true),
      maxSizeBytes: Joi.number()
        .integer()
        .default(1024 * 1024 * 10), // bytes in a kB * kB in a mB * 10
      scroll: Joi.object({
        duration: Joi.string()
          .regex(/^[0-9]+(d|h|m|s|ms|micros|nanos)$/, { name: 'DurationString' })
          .default('30s'),
        size: Joi.number()
          .integer()
          .default(500),
      }).default(),
    }).default(),
    encryptionKey: Joi.when(Joi.ref('$dist'), {
      is: true,
      then: Joi.string(),
      otherwise: Joi.string().default('a'.repeat(32)),
    }),
    roles: Joi.object({
      allow: Joi.array()
        .items(Joi.string())
        .default(['reporting_user']),
    }).default(),
    index: Joi.string().default('.reporting'),
    poll: Joi.object({
      jobCompletionNotifier: Joi.object({
        interval: Joi.number()
          .integer()
          .default(10000),
        intervalErrorMultiplier: Joi.number()
          .integer()
          .default(5),
      }).default(),
      jobsRefresh: Joi.object({
        interval: Joi.number()
          .integer()
          .default(5000),
        intervalErrorMultiplier: Joi.number()
          .integer()
          .default(5),
      }).default(),
    }).default(),
  }).default();
}
