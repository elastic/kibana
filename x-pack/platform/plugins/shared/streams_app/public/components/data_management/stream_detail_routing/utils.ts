/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { htmlIdGenerator } from '@elastic/eui';
import type { RoutingDefinition } from '@kbn/streams-schema';
import { omit } from 'lodash';
import { isAlwaysCondition, type Condition } from '@kbn/streamlang';
import type { RoutingDefinitionWithUIAttributes } from './types';
import { emptyEqualsToAlways } from '../../../util/condition';

const createId = htmlIdGenerator();
const toUIDefinition = <TRoutingDefinition extends RoutingDefinition>(
  routingDefinition: TRoutingDefinition
): RoutingDefinitionWithUIAttributes => ({
  id: createId(),
  status: routingDefinition.status ?? 'enabled',
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

export const processCondition = (condition?: Condition): Condition | undefined => {
  if (!condition) return undefined;
  const convertedCondition = emptyEqualsToAlways(condition);
  return convertedCondition && isAlwaysCondition(convertedCondition)
    ? undefined
    : convertedCondition;
};

// Convert SampleDocument[] to DataTableRecordWithIndex[] for flyout compatibility
export const toDataTableRecordWithIndex = <T>(documents: T[]) =>
  documents.map((doc, index) => ({
    raw: doc,
    flattened: doc,
    index,
    id: `${index}-${Date.now()}`,
  }));
