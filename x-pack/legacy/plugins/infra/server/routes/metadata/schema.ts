/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Joi from 'joi';
import { values } from 'lodash';
import { InfraNodeType } from '../../graphql/types';

export const schema = Joi.object({
  nodeId: Joi.string().required(),
  nodeType: Joi.string().valid(values(InfraNodeType)),
  sourceId: Joi.string().required(),
});
