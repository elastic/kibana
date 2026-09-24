/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';

import type { TestRenderer } from '../../../mock';
import { createFleetTestRendererMock } from '../../../mock';

import { ALL_PIPELINES, SIGNAL_PREFIX } from './utils';

import { PipelineSelector } from './pipeline_selector';

describe('PipelineSelector', () => {
  let testRenderer: TestRenderer;
  let onChange: jest.Mock;

  beforeEach(() => {
    testRenderer = createFleetTestRendererMock();
    onChange = jest.fn();
  });

  const render = (pipelineIds: string[], selectedPipelineId: string = ALL_PIPELINES) =>
    testRenderer.render(
      <PipelineSelector
        pipelineIds={pipelineIds}
        selectedPipelineId={selectedPipelineId}
        onChange={onChange}
      />
    );

  it('should render a select with the "All pipelines" option', () => {
    const result = render([]);
    const select = result.getByTestId('otelPipelineSelector');
    expect(select).toBeInTheDocument();
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(1);
    expect(options[0].value).toBe(ALL_PIPELINES);
    expect(options[0].textContent).toBe('All pipelines');
  });

  it('should render individual pipeline options', () => {
    const result = render(['traces/my-pipeline', 'logs/my-pipeline']);
    const options = result.getByTestId('otelPipelineSelector').querySelectorAll('option');
    expect(options).toHaveLength(3);
    expect(options[1].value).toBe('traces/my-pipeline');
    expect(options[2].value).toBe('logs/my-pipeline');
  });

  it('should render signal group options when a signal has more than one pipeline', () => {
    const pipelineIds = ['traces/pipeline-1', 'traces/pipeline-2', 'logs/pipeline-1'];
    const result = render(pipelineIds);
    const options = result.getByTestId('otelPipelineSelector').querySelectorAll('option');

    // All pipelines + 1 signal group (traces) + 3 individual pipelines
    expect(options).toHaveLength(5);
    expect(options[1].value).toBe(`${SIGNAL_PREFIX}traces`);
    expect(options[1].textContent).toBe('All traces (2 pipelines)');
  });

  it('should not render signal group option when a signal has only one pipeline', () => {
    const pipelineIds = ['traces/pipeline-1', 'logs/pipeline-1'];
    const result = render(pipelineIds);
    const options = result.getByTestId('otelPipelineSelector').querySelectorAll('option');

    // All pipelines + 2 individual pipelines, no signal groups
    expect(options).toHaveLength(3);
    expect(options[0].value).toBe(ALL_PIPELINES);
    expect(options[1].value).toBe('traces/pipeline-1');
    expect(options[2].value).toBe('logs/pipeline-1');
  });

  it('should render multiple signal group options when multiple signals have multiple pipelines', () => {
    const pipelineIds = [
      'traces/pipeline-1',
      'traces/pipeline-2',
      'metrics/pipeline-1',
      'metrics/pipeline-2',
    ];
    const result = render(pipelineIds);
    const options = result.getByTestId('otelPipelineSelector').querySelectorAll('option');

    // All pipelines + 2 signal groups + 4 individual pipelines
    expect(options).toHaveLength(7);
    expect(options[1].value).toBe(`${SIGNAL_PREFIX}traces`);
    expect(options[2].value).toBe(`${SIGNAL_PREFIX}metrics`);
  });

  it('should set the selected value', () => {
    const result = render(['traces/pipeline-1', 'logs/pipeline-1'], 'traces/pipeline-1');
    const select = result.getByTestId('otelPipelineSelector') as HTMLSelectElement;
    expect(select.value).toBe('traces/pipeline-1');
  });

  it('should call onChange when a pipeline is selected', () => {
    const result = render(['traces/pipeline-1', 'logs/pipeline-1']);
    const select = result.getByTestId('otelPipelineSelector');
    fireEvent.change(select, { target: { value: 'logs/pipeline-1' } });
    expect(onChange).toHaveBeenCalledWith('logs/pipeline-1');
  });
});
