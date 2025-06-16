/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { LensRenderer } from './lens_renderer';
import { lensVisualization } from './index.mock';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import { renderWithTestingProviders } from '../../common/mock';

describe('LensRenderer', () => {
  const mockEmbeddableComponent = jest
    .fn()
    .mockReturnValue(<div data-test-subj="embeddableComponent" />);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the lens visualization correctly', () => {
    const services = createStartServicesMock();
    services.lens.EmbeddableComponent = mockEmbeddableComponent;

    // @ts-expect-error: props are correct
    renderWithTestingProviders(<LensRenderer {...lensVisualization} />, {
      wrapperProps: { services },
    });

    expect(screen.getByTestId('embeddableComponent')).toBeInTheDocument();
  });

  it('renders the lens visualization with correct attributes', () => {
    const services = createStartServicesMock();
    services.lens.EmbeddableComponent = mockEmbeddableComponent;

    // @ts-expect-error: props are correct
    renderWithTestingProviders(<LensRenderer {...lensVisualization} />, {
      wrapperProps: { services },
    });

    expect(mockEmbeddableComponent).toHaveBeenCalledWith(
      {
        id: '',
        attributes: lensVisualization.attributes,
        timeRange: lensVisualization.timeRange,
        disableTriggers: true,
        executionContext: {
          type: 'cases',
        },
        renderMode: 'view',
        style: {
          height: 200,
        },
        syncCursor: false,
        syncTooltips: false,
      },
      {}
    );
  });

  it('does not renders the lens visualization if the attributes are not defined', () => {
    const services = createStartServicesMock();
    services.lens.EmbeddableComponent = mockEmbeddableComponent;

    // @ts-expect-error: props are correct
    renderWithTestingProviders(<LensRenderer {...lensVisualization} attributes={undefined} />, {
      wrapperProps: { services },
    });

    expect(screen.queryByTestId('embeddableComponent')).not.toBeInTheDocument();
  });

  it('renders the lens visualization with description', () => {
    const services = createStartServicesMock();
    services.lens.EmbeddableComponent = mockEmbeddableComponent;

    renderWithTestingProviders(
      // @ts-expect-error: props are correct
      <LensRenderer {...lensVisualization} metadata={{ description: 'description' }} />,
      { wrapperProps: { services } }
    );

    expect(screen.getByText('description')).toBeInTheDocument();
  });
});
