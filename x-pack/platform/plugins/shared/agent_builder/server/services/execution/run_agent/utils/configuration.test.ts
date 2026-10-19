/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { agentBuilderDefaultAiIndexId } from '@kbn/agent-builder-common';
import { resolveConfiguration } from './configuration';

describe('resolveConfiguration', () => {
  const request = httpServerMock.createKibanaRequest();
  const configuration = {
    tools: [],
    ai_indices: [agentBuilderDefaultAiIndexId, 'custom-index'],
  };

  it('keeps the default AI index when it is enabled', async () => {
    const resolved = await resolveConfiguration(configuration, {
      aiIndicesEnabled: true,
      defaultAiIndexEnabled: true,
      request,
    });

    expect(resolved.aiIndices).toEqual([agentBuilderDefaultAiIndexId, 'custom-index']);
    expect(resolved.aiIndexCatalog?.map(({ id }) => id)).toEqual([
      agentBuilderDefaultAiIndexId,
      'custom-index',
    ]);
  });

  it('drops the default AI index when it is disabled, keeping custom ones', async () => {
    const resolved = await resolveConfiguration(configuration, {
      aiIndicesEnabled: true,
      defaultAiIndexEnabled: false,
      request,
    });

    expect(resolved.aiIndices).toEqual(['custom-index']);
    expect(resolved.aiIndexCatalog?.map(({ id }) => id)).toEqual(['custom-index']);
  });

  it('omits the catalog when AI indices are disabled', async () => {
    const resolved = await resolveConfiguration(configuration, {
      aiIndicesEnabled: false,
      defaultAiIndexEnabled: true,
      request,
    });

    expect(resolved.aiIndexCatalog).toBeUndefined();
  });
});
