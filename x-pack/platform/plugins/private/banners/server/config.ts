/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { get } from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';
import { isHexColor } from './utils';

const configSchema = schema.object({
  placement: schema.oneOf([schema.literal('disabled'), schema.literal('top')], {
    defaultValue: 'disabled',
  }),
  textContent: schema.string({ defaultValue: '' }),
  textColor: schema.string({
    validate: (color) => {
      if (!isHexColor(color)) {
        return `must be an hex color`;
      }
    },
    defaultValue: '#8A6A0A',
  }),
  backgroundColor: schema.string({
    validate: (color) => {
      if (!isHexColor(color)) {
        return `must be an hex color`;
      }
    },
    defaultValue: '#FFF9E8',
  }),
  disableSpaceBanners: schema.boolean({ defaultValue: false }),
});

export type BannersConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<BannersConfigType> = {
  schema: configSchema,
  exposeToBrowser: {},
};
