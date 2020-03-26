/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Root } from 'joi';
import { savedObjectMappings } from '../../../plugins/infra/server';

export function infra(kibana: any) {
  return new kibana.Plugin({
    id: 'infra',
    configPrefix: 'xpack.infra',
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      mappings: savedObjectMappings,
    },
    config(Joi: Root) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      })
        .unknown()
        .default();
    },
  });
}
