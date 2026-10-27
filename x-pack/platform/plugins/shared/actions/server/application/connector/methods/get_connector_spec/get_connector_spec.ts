/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpecsClient } from '../../../../specs_client';
import { getRegisteredSpec } from '../../../../specs_client/lib/get_registered_spec';
import type { GetConnectorSpecParams } from './types';

export async function getConnectorSpecAsJsonSchema({
  context,
  id,
  configurationUtilities,
}: GetConnectorSpecParams) {
  const client = new SpecsClient({
    actionTypeRegistry: context.actionTypeRegistry,
    configurationUtilities,
    authorization: context.authorization,
    auditLogger: context.auditLogger,
  });
  const detail = await client.get({ id });
  const { spec } = getRegisteredSpec(context.actionTypeRegistry, id);

  return {
    metadata: spec.metadata,
    schema: detail.formSchema,
    isTestable: detail.isTestable,
    actions: detail.actions.map(({ name, isTool, description, scope }) => ({
      name,
      isTool,
      ...(description !== undefined ? { description } : {}),
      ...(scope !== undefined ? { scope } : {}),
    })),
  };
}
