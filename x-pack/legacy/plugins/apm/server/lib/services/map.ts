/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import cytoscape from 'cytoscape';
import { PromiseReturnType } from '../../../typings/common';

// This response right now just returns experimental data.
export type ServiceMapResponse = PromiseReturnType<typeof getServiceMap>;
export async function getServiceMap(): Promise<cytoscape.ElementDefinition[]> {
  return [
    { data: { id: 'client', agentName: 'js-base' } },
    { data: { id: 'opbeans-node', agentName: 'nodejs' } },
    { data: { id: 'opbeans-python', agentName: 'python' } },
    { data: { id: 'opbeans-java', agentName: 'java' } },
    { data: { id: 'opbeans-ruby', agentName: 'ruby' } },
    { data: { id: 'opbeans-go', agentName: 'go' } },
    { data: { id: 'opbeans-go-2', agentName: 'go' } },
    { data: { id: 'opbeans-dotnet', agentName: 'dotnet' } },
    { data: { id: 'database', agentName: 'database' } },
    { data: { id: 'external API', agentName: 'external' } },

    {
      data: {
        id: 'opbeans-client~opbeans-node',
        source: 'client',
        target: 'opbeans-node'
      }
    },
    {
      data: {
        id: 'opbeans-client~opbeans-python',
        source: 'client',
        target: 'opbeans-python'
      }
    },
    {
      data: {
        id: 'opbeans-python~opbeans-go',
        source: 'opbeans-python',
        target: 'opbeans-go'
      }
    },
    {
      data: {
        id: 'opbeans-python~opbeans-go-2',
        source: 'opbeans-python',
        target: 'opbeans-go-2'
      }
    },
    {
      data: {
        id: 'opbeans-python~opbeans-dotnet',
        source: 'opbeans-python',
        target: 'opbeans-dotnet'
      }
    },
    {
      data: {
        id: 'opbeans-node~opbeans-java',
        source: 'opbeans-node',
        target: 'opbeans-java'
      }
    },
    {
      data: {
        id: 'opbeans-node~database',
        source: 'opbeans-node',
        target: 'database'
      }
    },
    {
      data: {
        id: 'opbeans-go-2~opbeans-ruby',
        source: 'opbeans-go-2',
        target: 'opbeans-ruby'
      }
    },
    {
      data: {
        id: 'opbeans-go-2~external API',
        source: 'opbeans-go-2',
        target: 'external API'
      }
    }
  ];
}
