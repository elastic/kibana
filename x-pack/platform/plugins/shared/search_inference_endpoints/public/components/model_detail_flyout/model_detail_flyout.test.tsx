/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import { ModelDetailFlyout } from './model_detail_flyout';

const MODEL_ID = 'test-model';

const createEndpoint = (
  overrides: Partial<InferenceAPIConfigResponse> = {}
): InferenceAPIConfigResponse => ({
  inference_id: 'my-endpoint',
  task_type: 'text_embedding',
  service: 'elastic',
  service_settings: { model_id: MODEL_ID },
  ...overrides,
});

describe('ModelDetailFlyout', () => {
  const onClose = jest.fn();
  const onSaveEndpoint = jest.fn();
  const onDeleteEndpoint = jest.fn();
  const onCopyEndpointId = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  const renderFlyout = (
    modelId = MODEL_ID,
    allEndpoints: InferenceAPIConfigResponse[] = [createEndpoint()]
  ) =>
    render(
      <ModelDetailFlyout
        modelId={modelId}
        allEndpoints={allEndpoints}
        onClose={onClose}
        onSaveEndpoint={onSaveEndpoint}
        onDeleteEndpoint={onDeleteEndpoint}
        onCopyEndpointId={onCopyEndpointId}
      />
    );

  it('renders flyout with model_id as header when no display metadata', () => {
    renderFlyout();
    expect(screen.getByText(MODEL_ID)).toBeInTheDocument();
  });

  it('renders display name from metadata when available', () => {
    const endpoint = {
      ...createEndpoint(),
      metadata: { display: { name: 'Anthropic Claude Opus 4.5', model_creator: 'Anthropic' } },
    } as unknown as InferenceAPIConfigResponse;
    renderFlyout(MODEL_ID, [endpoint]);

    expect(screen.getByText('Anthropic Claude Opus 4.5')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
  });

  it('falls back to Unknown for model author when no creator metadata', () => {
    renderFlyout();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders task type badges in header', () => {
    const endpoints = [
      createEndpoint({ inference_id: 'ep-1', task_type: 'text_embedding' }),
      createEndpoint({ inference_id: 'ep-2', task_type: 'completion' }),
    ];
    renderFlyout(MODEL_ID, endpoints);

    expect(screen.getAllByText('text_embedding').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('completion').length).toBeGreaterThanOrEqual(1);
  });

  it('filters endpoints by modelId', () => {
    const endpoints = [
      createEndpoint({ inference_id: 'ep-match', service_settings: { model_id: MODEL_ID } }),
      createEndpoint({
        inference_id: 'ep-other',
        service_settings: { model_id: 'other-model' },
      }),
    ];
    renderFlyout(MODEL_ID, endpoints);

    expect(screen.getByText('ep-match')).toBeInTheDocument();
    expect(screen.queryByText('ep-other')).not.toBeInTheDocument();
  });

  it('renders all matching endpoints', () => {
    const endpoints = [
      createEndpoint({ inference_id: 'endpoint-a' }),
      createEndpoint({ inference_id: 'endpoint-b' }),
    ];
    renderFlyout(MODEL_ID, endpoints);

    expect(screen.getByText('endpoint-a')).toBeInTheDocument();
    expect(screen.getByText('endpoint-b')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    renderFlyout();
    fireEvent.click(screen.getByTestId('modelDetailFlyoutCloseButton'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders documentation link', () => {
    renderFlyout();
    expect(screen.getByText('View documentation')).toBeInTheDocument();
  });
});
