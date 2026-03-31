/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import { ModelEndpointRow } from './model_endpoint_row';

const createEndpoint = (
  overrides: Partial<InferenceAPIConfigResponse> = {}
): InferenceAPIConfigResponse => ({
  inference_id: 'my-endpoint',
  task_type: 'text_embedding',
  service: 'elastic',
  service_settings: {},
  ...overrides,
});

describe('ModelEndpointRow', () => {
  const onView = jest.fn();
  const onCopy = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders endpoint id and task type badge', () => {
    render(<ModelEndpointRow endpoint={createEndpoint()} onView={onView} onCopy={onCopy} />);

    expect(screen.getByText('my-endpoint')).toBeInTheDocument();
    expect(screen.getByText('text_embedding')).toBeInTheDocument();
  });

  it('calls onView when eye button is clicked', () => {
    const endpoint = createEndpoint();
    render(<ModelEndpointRow endpoint={endpoint} onView={onView} onCopy={onCopy} />);

    fireEvent.click(screen.getByLabelText('View endpoint'));
    expect(onView).toHaveBeenCalledWith(endpoint);
  });

  it('calls onCopy when copy button is clicked', () => {
    render(<ModelEndpointRow endpoint={createEndpoint()} onView={onView} onCopy={onCopy} />);

    fireEvent.click(screen.getByLabelText('Copy endpoint ID'));
    expect(onCopy).toHaveBeenCalledWith('my-endpoint');
  });

  it('shows lock icon for preconfigured endpoints', () => {
    render(
      <ModelEndpointRow
        endpoint={createEndpoint({ inference_id: '.elser-endpoint' })}
        onView={onView}
        onCopy={onCopy}
      />
    );

    expect(screen.getByLabelText('Preconfigured endpoint')).toBeInTheDocument();
  });

  it('does not show lock icon for user-defined endpoints', () => {
    render(<ModelEndpointRow endpoint={createEndpoint()} onView={onView} onCopy={onCopy} />);

    expect(screen.queryByLabelText('Preconfigured endpoint')).not.toBeInTheDocument();
  });
});
