/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod';

import { dateType } from '../../schema/common';
import { sliRetentionSchema } from '../../schema/global_settings';

const putSLOGlobalSettingsParamsSchema = lazySchema(() =>
  z.object({
    body: z.object({
      sliRetention: sliRetentionSchema.describe(
        'The SLI retention settings. Both fields are required: the whole block is replaced.'
      ),
    }),
  })
);

const effectiveSliRetentionSchema = lazySchema(() =>
  z
    .object({
      enabled: z.boolean().describe('Indicates if SLI retention is applied'),
      periodDays: z.number().int().describe('The number of days of SLI data kept'),
      source: z
        .enum(['default', 'settings', 'config'])
        .describe(
          'Where the applied value comes from: the default, the saved settings, or the `xpack.slo.sliRetention` setting in kibana.yml'
        ),
    })
    .meta({ id: 'SLOEffectiveSliRetention', additionalProperties: true })
);

const sloGlobalSettingsResponseSchema = lazySchema(() =>
  z
    .object({
      sliRetention: sliRetentionSchema
        .extend({
          updatedAt: dateType
            .nullable()
            .describe('When the SLI retention was last saved, or null when it was never saved'),
          effective: effectiveSliRetentionSchema.describe(
            'The SLI retention applied by Kibana, which can differ from the saved value'
          ),
        })
        .meta({ additionalProperties: true }),
    })
    .meta({
      id: 'SLOGlobalSettingsResponse',
      description:
        'The saved global SLO settings, the date they were last saved, and the settings applied by Kibana',
      additionalProperties: true,
    })
);

const getSLOGlobalSettingsResponseSchema = sloGlobalSettingsResponseSchema;
const putSLOGlobalSettingsResponseSchema = sloGlobalSettingsResponseSchema;

type PutSLOGlobalSettingsParams = z.output<typeof putSLOGlobalSettingsParamsSchema.shape.body>;
type GetSLOGlobalSettingsResponse = z.input<typeof sloGlobalSettingsResponseSchema>;
type PutSLOGlobalSettingsResponse = z.input<typeof sloGlobalSettingsResponseSchema>;

export {
  getSLOGlobalSettingsResponseSchema,
  putSLOGlobalSettingsParamsSchema,
  putSLOGlobalSettingsResponseSchema,
};
export type {
  GetSLOGlobalSettingsResponse,
  PutSLOGlobalSettingsParams,
  PutSLOGlobalSettingsResponse,
};
