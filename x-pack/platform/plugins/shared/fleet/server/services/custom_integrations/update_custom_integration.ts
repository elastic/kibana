/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';
export async function updateCustomIntegration(
  esClient: ElasticsearchClient,
  id: string,
  fields: any[]
) {
  console.log('updating the integration!!');

  // TODO: figure out where the integration is actually stored so I can update it here. Presumably in ES, but idk? Need to update the readme doc in the docs section, and also categories

  // return response;
  return { status: 'updated' };
}
