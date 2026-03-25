/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import type { GroupedInferenceEndpointsData } from '../../types';
import { ModelDetailFlyout } from './model_detail_flyout';

const createEndpoint = (
  overrides: Partial<InferenceAPIConfigResponse> = {}
): InferenceAPIConfigResponse => ({
  inference_id: 'my-endpoint',
  task_type: 'text_embedding',
  service: 'elastic',
  service_settings: {},
  ...overrides,
});

const createModelGroup = (
  endpoints: InferenceAPIConfigResponse[] = [createEndpoint()]
): GroupedInferenceEndpointsData => ({
  groupId: 'test-model',
  groupLabel: 'Test Model',
  endpoints,
});

describe('ModelDetailFlyout', () => {
  const onClose = jest.fn();
  const onAddEndpoint = jest.fn();
  const onViewEndpoint = jest.fn();
  const onCopyEndpointId = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  const renderFlyout = (group = createModelGroup()) =>
    render(
      <ModelDetailFlyout
        modelGroup={group}
        onClose={onClose}
        onAddEndpoint={onAddEndpoint}
        onViewEndpoint={onViewEndpoint}
        onCopyEndpointId={onCopyEndpointId}
      />
    );

  it('renders flyout with model name in header', () => {
    renderFlyout();
    expect(screen.getByText('Test Model')).toBeInTheDocument();
  });

  it('renders task type badges in header', () => {
    const group = createModelGroup([
      createEndpoint({ inference_id: 'ep-1', task_type: 'text_embedding' }),
      createEndpoint({ inference_id: 'ep-2', task_type: 'completion' }),
    ]);
    renderFlyout(group);

    expect(screen.getAllByText('text_embedding').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('completion').length).toBeGreaterThanOrEqual(1);
  });

  it('renders service display name as model author', () => {
    renderFlyout(createModelGroup([createEndpoint({ service: 'anthropic' })]));
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
  });

  it('renders all endpoints', () => {
    const group = createModelGroup([
      createEndpoint({ inference_id: 'endpoint-a' }),
      createEndpoint({ inference_id: 'endpoint-b' }),
    ]);
    renderFlyout(group);

    expect(screen.getByText('endpoint-a')).toBeInTheDocument();
    expect(screen.getByText('endpoint-b')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    renderFlyout();
    fireEvent.click(screen.getByTestId('modelDetailFlyoutCloseButton'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onAddEndpoint when add endpoint button is clicked', () => {
    renderFlyout();
    fireEvent.click(screen.getByTestId('modelDetailFlyoutAddEndpointButton'));
    expect(onAddEndpoint).toHaveBeenCalled();
  });

  it('renders documentation link', () => {
    renderFlyout();
    expect(screen.getByText('View documentation')).toBeInTheDocument();
  });
});
