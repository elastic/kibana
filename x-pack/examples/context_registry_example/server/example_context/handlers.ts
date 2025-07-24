/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { TimeRange } from '@kbn/es-query';
import { ContextResponse } from '@kbn/context-registry-plugin/server';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import type { SyntheticsMonitorContext } from '../../common/types';

export const getExampleByServiceName = async ({
  /* Example of passing dependencies to the handler
   * Not in use as data fetching is mocked */
  dependencies,
  params,
}: {
  dependencies: {
    savedObjectsClient: SavedObjectsClientContract;
    share: SharePluginStart;
  };
  params: {
    timeRange: TimeRange;
    serviceName: string;
  };
}): Promise<ContextResponse<SyntheticsMonitorContext>> => {
  const mockResult = {
    saved_objects: [
      {
        attributes: {
          name: 'Example Monitor',
          id: 'example-monitor-id',
        },
      },
      {
        attributes: {
          name: 'Another Monitor',
          id: 'another-monitor-id',
        },
      },
    ],
  };

  /* Fetch any data you need to back the suggestion from Elasticsearch, saved objects, or other sources
   * Mocked here */
  const result = await new Promise<{
    saved_objects: Array<{ attributes: { name: string; id: string } }>;
  }>((resolve) => resolve(mockResult));

  /* Generate the data for the context response. You can include one or more context items as part of the response.
   * Here we are including one context item per monitor we've found, all as part of the same context response.
   * However, you can also limit the amount of context items you return as you see fit, and in many case may only
   * want to return one */
  const data = result.saved_objects.map((obj) => {
    return {
      // a plaintext description of why the individual context is relevant
      description: `Monitor "${obj.attributes.name}" is down 5 times between ${params.timeRange.from} and ${params.timeRange.to}`,
      payload: obj.attributes,
    };
  });

  return {
    key: 'example',
    // a plaintext summary of the entire payload, which may include multiple individual context items
    description: `Found ${data.length} synthetics monitors for service "${params.serviceName}" in the last ${params.timeRange.from} to ${params.timeRange.to}`,
    data,
  };
};
