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

export const Primary: Story = {
  args: {
    items: [
      {
        label: 'Pipeline 1',
        id: 'pipeline1',
        children: [
          {
            label: 'Pipeline 2',
            id: 'pipeline2',
            children: [
              {
                label: 'Pipeline 5',
                id: 'pipeline5'
              },
            ]
          },
          {
            label: 'Pipeline 3',
            id: 'pipeline3'
          },
          {
            label: 'Pipeline 4',
            id: 'pipeline4'
          }
        ]
      }
    ],
  },
};
