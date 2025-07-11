/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';

import { PipelineStructureTree } from './pipeline_structure_tree';

const meta: Meta<typeof PipelineStructureTree> = {
  component: PipelineStructureTree,
  title: 'Ingest Pipelines/Pipeline Structure Tree',
};

export default meta;
type Story = StoryObj<typeof PipelineStructureTree>;

const pipelineTree = {
  pipelineName: 'logs_kubernetes.container_logs-1.80.2',
  isManaged: true,
  children: [
    {
      pipelineName: 'global@custom',
      isManaged: true,
      isDeprecated: true,
      children: [
        {
          pipelineName: 'pipeline-level-3',
          isManaged: false,
          isDeprecated: false,
          children: [
            {
              pipelineName: 'pipeline-level-4',
              isManaged: false,
              isDeprecated: true,
              children: [
                {
                  pipelineName: 'pipeline-level-5',
                  isManaged: true,
                  isDeprecated: false,
                  children: [
                    {
                      // This node shouldn't be displayed as it is on level 6
                      pipelineName: 'pipeline-level-6',
                      isManaged: true,
                      isDeprecated: false,
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      pipelineName: 'logs@custom',
      isManaged: false,
      isDeprecated: true,
      children: [],
    },
    {
      pipelineName: 'logs_kubernetes.container_logs-default',
      isManaged: true,
      isDeprecated: false,
      children: [],
    },
    {
      pipelineName: 'pipeline-level-2',
      isManaged: true,
      isDeprecated: false,
      children: [],
    },
  ],
};

export const Primary: Story = {
  args: {
    pipelineTree,
  },
};
