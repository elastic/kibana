/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

import { ActionType, ActionTypeExecutorOptions } from '../types';

const DEFAULT_TAGS = ['info', 'alerting'];

const PARAMS_SCHEMA = Joi.object().keys({
  message: Joi.string().required(),
  tags: Joi.array()
    .items(Joi.string())
    .optional()
    .default(DEFAULT_TAGS),
});

export const actionType: ActionType = {
  id: '.server-log',
  name: 'server-log',
  unencryptedAttributes: [],
  validate: {
    params: PARAMS_SCHEMA,
  },
  executor,
};

async function executor({ params, services }: ActionTypeExecutorOptions): Promise<any> {
  const { message, tags } = params;

  services.log(tags, message);
}
