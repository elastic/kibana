/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { htmlIdGenerator } from '@elastic/eui';
import { RoutingDefinition } from '@kbn/streams-schema';
import { omit } from 'lodash';
import { RoutingDefinitionWithUIAttributes } from './types';

const createId = htmlIdGenerator();
const toUIDefinition = <TRoutingDefinition extends RoutingDefinition>(
  routingDefinition: TRoutingDefinition
): RoutingDefinitionWithUIAttributes => ({
  id: createId(),
  ...routingDefinition,
});

const toAPIDefinition = (
  routingDefinitionWithAttributes: RoutingDefinitionWithUIAttributes
): RoutingDefinition => {
  return omit(routingDefinitionWithAttributes, 'id');
};

export const routingConverter = {
  toAPIDefinition,
  toUIDefinition,
};
