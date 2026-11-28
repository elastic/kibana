/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';

const rejectForwardSlash = (name: string) =>
  name.includes('/')
    ? i18n.translate('xpack.idxMgmt.templates.validation.nameForwardSlashError', {
        defaultMessage: 'A template name must not contain the character "/"',
      })
    : undefined;

export const createTemplateNameSchema = schema.string({
  maxLength: 1000,
  validate: rejectForwardSlash,
});

const templateSharedFields = {
  indexPatterns: schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 1000 }),
  version: schema.maybe(schema.number()),
  order: schema.maybe(schema.number()),
  priority: schema.maybe(schema.number()),
  indexMode: schema.maybe(schema.string({ maxLength: 1000 })),
  // Not present for legacy templates
  allowAutoCreate: schema.maybe(schema.string({ maxLength: 1000 })),
  template: schema.maybe(
    schema.object({
      settings: schema.maybe(schema.object({}, { unknowns: 'allow' })),
      aliases: schema.maybe(schema.object({}, { unknowns: 'allow' })),
      mappings: schema.maybe(schema.object({}, { unknowns: 'allow' })),
      lifecycle: schema.maybe(
        schema.object({
          enabled: schema.boolean(),
          data_retention: schema.maybe(schema.string({ maxLength: 1000 })),
          frozen_after: schema.maybe(schema.string({ maxLength: 1000 })),
        })
      ),
      data_stream_options: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    })
  ),
  composedOf: schema.maybe(schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 1000 })),
  ignoreMissingComponentTemplates: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 1000 })
  ),
  dataStream: schema.maybe(
    schema.object(
      {
        hidden: schema.maybe(schema.boolean()),
      },
      { unknowns: 'allow' }
    )
  ),
  _meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  ilmPolicy: schema.maybe(
    schema.object({
      name: schema.maybe(schema.string({ maxLength: 1000 })),
      rollover_alias: schema.maybe(schema.string({ maxLength: 1000 })),
    })
  ),
  _kbnMeta: schema.object({
    type: schema.string({ maxLength: 1000 }),
    hasDatastream: schema.maybe(schema.boolean()),
    isLegacy: schema.maybe(schema.boolean()),
  }),
  deprecated: schema.maybe(schema.boolean()),
};

export const templateSchema = schema.object({
  name: schema.string({ maxLength: 1000 }),
  ...templateSharedFields,
});

export const createTemplateSchema = schema.object({
  name: createTemplateNameSchema,
  ...templateSharedFields,
});
