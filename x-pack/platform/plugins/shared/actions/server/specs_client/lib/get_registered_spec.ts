/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ConnectorSpec } from '@kbn/connector-specs';
import type { ActionType as CommonActionType } from '../../../common';
import type { ActionTypeRegistryContract } from '../../types';

export interface RegisteredSpec {
  spec: ConnectorSpec;
  type: CommonActionType;
}

export const getRegisteredSpec = (
  registry: Pick<ActionTypeRegistryContract, 'getSpec' | 'list'>,
  id: string
): RegisteredSpec => {
  const spec = registry.getSpec(id);
  if (!spec) {
    throw Boom.notFound(`Spec for connector type "${id}" not found.`);
  }

  const type = registry.list().find((row) => row.id === id);
  if (!type) {
    throw Boom.notFound(`Spec for connector type "${id}" not found.`);
  }

  return { spec, type };
};
