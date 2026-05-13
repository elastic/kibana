/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { RoleApiCredentials, ScoutWorkerFixtures } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { deletePipeline } from '../../helpers';
import { apiTest, testData } from '../fixtures';

interface PipelineTreeNode {
  pipelineName: string;
  children: PipelineTreeNode[];
}

apiTest.describe('Ingest pipelines structure tree API', { tag: tags.stateful.classic }, () => {
  const createdPipelines: string[] = [];
  let adminCredentials: RoleApiCredentials;

  /**
   * This function generates a Geometric series tree of levels and each node
   * on each level has childrenPerNode children.
   *
   * This creates a total of 1 + N + N^2 + N^3 + ... + N^(M-1) unique pipelines,
   * where N is childrenPerNode and M is levels.
   *
   * For example, a tree with 3 levels and 3 children per node:
   * treePipeline   // root
   * ├── treePipeline-0
   * │   ├── treePipeline-0_0
   * │   ├── treePipeline-0_1
   * │   └── treePipeline-0_2
   * ├── treePipeline-1
   * │   ├── treePipeline-1_0
   * │   ├── treePipeline-1_1
   * │   └── treePipeline-1_2
   * └── treePipeline-2
   *     ├── treePipeline-2_0
   *     ├── treePipeline-2_1
   *     └── treePipeline-2_2
   */
  const createComplexTree = async ({
    esClient,
    levels,
    childrenPerNode,
  }: {
    esClient: ScoutWorkerFixtures['esClient'];
    levels: number;
    childrenPerNode: number;
  }) => {
    const treePipelines: string[] = [];
    const getPipelineIdFromPath = (path: number[]): string =>
      path.length === 0 ? 'treePipeline' : `treePipeline-${path.join('_')}`;

    const createNode = async (currentLevel: number, path: number[]): Promise<string> => {
      const pipelineId = getPipelineIdFromPath(path);
      const processors: IngestProcessorContainer[] = [{ set: { field: 'foo', value: 'bar' } }];

      if (currentLevel < levels) {
        for (let index = 0; index < childrenPerNode; index++) {
          const childId = await createNode(currentLevel + 1, [...path, index]);
          processors.push({ pipeline: { name: childId } });
        }
      }

      await esClient.ingest.putPipeline({
        id: pipelineId,
        deprecated: currentLevel % 2 === 0,
        _meta: {
          managed: currentLevel % 3 === 0,
        },
        processors,
      });
      treePipelines.push(pipelineId);
      return pipelineId;
    };

    // Start with the root path []
    await createNode(1, []);
    return treePipelines;
  };

  apiTest.beforeAll(async ({ esClient, requestAuth }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
    // Create a complex tree of 7 levels and 3 children per node.
    const treePipelines = await createComplexTree({ esClient, levels: 7, childrenPerNode: 3 });
    createdPipelines.push(...treePipelines);
  });

  apiTest.afterAll(async ({ esClient, log }) => {
    for (const pipelineId of createdPipelines) {
      await deletePipeline({ esClient, pipelineName: pipelineId, log });
    }
  });

  apiTest('fetches a complex structure tree up to the fifth level', async ({ apiClient }) => {
    const response = await apiClient.get(`${testData.STRUCTURE_TREE_API_BASE_PATH}/treePipeline`, {
      headers: {
        ...testData.COMMON_HEADERS,
        ...adminCredentials.apiKeyHeader,
      },
    });

    expect(response).toHaveStatusCode(200);
    const resultTree = (response.body as { pipelineStructureTree: PipelineTreeNode })
      .pipelineStructureTree;

    // Level 1 (root):
    expect(resultTree.pipelineName).toBe('treePipeline');
    // Level 2:
    expect(resultTree.children[2].pipelineName).toBe('treePipeline-2');
    // Level 3:
    expect(resultTree.children[1].children[2].pipelineName).toBe('treePipeline-1_2');
    // Level 4:
    expect(resultTree.children[0].children[2].children[1].pipelineName).toBe('treePipeline-0_2_1');
    // Level 5:
    expect(resultTree.children[2].children[1].children[0].children[2].pipelineName).toBe(
      'treePipeline-2_1_0_2'
    );
    // Level 6:
    expect(
      resultTree.children[2].children[0].children[2].children[1].children[0].pipelineName
    ).toBe('treePipeline-2_0_2_1_0');
    // Verify that we don't fetch beyond the sixth level:
    expect(
      resultTree.children[2].children[0].children[2].children[1].children[0].children
    ).toHaveLength(0);
  });
});
