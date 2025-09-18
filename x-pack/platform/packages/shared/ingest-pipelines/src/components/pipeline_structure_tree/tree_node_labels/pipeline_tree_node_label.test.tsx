/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { PipelineTreeNodeLabel } from './pipeline_tree_node_label';

describe('PipelineTreeNodeLabel', () => {
  it('renders', () => {
    const { getByTestId } = render(
      <PipelineTreeNodeLabel pipelineName="test-pipeline" isManaged={false} isDeprecated={false} />
    );

    const label = getByTestId('pipelineTreeNode-test-pipeline');
    expect(label).toBeInTheDocument();
  });

  it('renders managed icon when isManaged is true', () => {
    const { getByTestId } = render(
      <PipelineTreeNodeLabel
        pipelineName="managed-pipeline"
        isManaged={true}
        isDeprecated={false}
      />
    );

    expect(getByTestId('pipelineTreeNode-managed-pipeline-managedIcon')).toBeInTheDocument();
  });

  it('renders deprecated icon when isDeprecated is true', () => {
    const { getByTestId } = render(
      <PipelineTreeNodeLabel
        pipelineName="deprecated-pipeline"
        isManaged={false}
        isDeprecated={true}
      />
    );

    expect(getByTestId('pipelineTreeNode-deprecated-pipeline-deprecatedIcon')).toBeInTheDocument();
  });

  it('renders both managed and deprecated icons when both flags are true', () => {
    const { getByTestId } = render(
      <PipelineTreeNodeLabel pipelineName="both" isManaged={true} isDeprecated={true} />
    );

    expect(getByTestId('pipelineTreeNode-both-managedIcon')).toBeInTheDocument();
    expect(getByTestId('pipelineTreeNode-both-deprecatedIcon')).toBeInTheDocument();
  });
});
