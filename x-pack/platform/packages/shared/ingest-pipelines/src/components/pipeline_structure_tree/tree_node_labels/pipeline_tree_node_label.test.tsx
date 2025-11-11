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
      <PipelineTreeNodeLabel
        pipelineName="test-pipeline"
        isManaged={false}
        isDeprecated={false}
        onClick={() => {}}
        level={0}
      />
    );

    const label = getByTestId('pipelineTreeNode-test-pipeline');
    expect(label.textContent).toBe('test-pipeline');
  });

  it('renders managed icon when isManaged is true', () => {
    const { getByTestId } = render(
      <PipelineTreeNodeLabel
        pipelineName="managed-pipeline"
        isManaged={true}
        isDeprecated={false}
        onClick={() => {}}
        level={0}
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
        onClick={() => {}}
        level={0}
      />
    );

    expect(getByTestId('pipelineTreeNode-deprecated-pipeline-deprecatedIcon')).toBeInTheDocument();
  });

  it('renders both managed and deprecated icons when both flags are true', () => {
    const { getByTestId } = render(
      <PipelineTreeNodeLabel
        pipelineName="both"
        isManaged={true}
        isDeprecated={true}
        onClick={() => {}}
        level={0}
      />
    );

    expect(getByTestId('pipelineTreeNode-both-managedIcon')).toBeInTheDocument();
    expect(getByTestId('pipelineTreeNode-both-deprecatedIcon')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    const { getByTestId } = render(
      <PipelineTreeNodeLabel
        pipelineName="clickable-pipeline"
        isManaged={false}
        isDeprecated={false}
        onClick={handleClick}
        level={0}
      />
    );

    const label = getByTestId('pipelineTreeNode-clickable-pipeline-link');
    label.click();

    expect(handleClick).toHaveBeenCalled();
  });

  it('truncates long pipeline names', () => {
    const handleClick = jest.fn();
    const longName = 'a'.repeat(100);
    const { getByTestId } = render(
      <PipelineTreeNodeLabel
        pipelineName={longName}
        isManaged={false}
        isDeprecated={false}
        onClick={handleClick}
        level={0}
      />
    );

    const label = getByTestId(`pipelineTreeNode-${longName}-link`);
    expect(label.textContent).toBe(`${longName.slice(0, 40)}...`);
  });
});
