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
  title: 'Ingest Pipelines/Structure Tree',
};

export default meta;
type Story = StoryObj<typeof PipelineStructureTree>;

const pipelineTree = {
  pipelineName: 'pipeline1',
  isManaged: true,
  children: [
    {
      pipelineName: 'pipeline2',
      isManaged: true,
      children: [
        {
          pipelineName: 'pipeline5',
          isManaged: false,
          children: [
            {
              pipelineName: 'pipeline6',
              isManaged: false,
              children: [
                {
                  pipelineName: 'pipeline7',
                  isManaged: true,
                  children: [
                    {
                      // This node shouldn't be displayed as it is on level 6
                      pipelineName: 'pipeline8',
                      isManaged: true,
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
      pipelineName: 'pipeline3',
      isManaged: false,
      children: [],
    },
    {
      pipelineName: 'pipeline4',
      isManaged: true,
      children: [],
    },
  ],
};

export const Primary: Story = {
  args: {
    pipelineTree,
  },
};
