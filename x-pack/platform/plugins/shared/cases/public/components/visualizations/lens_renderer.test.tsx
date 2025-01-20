/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { LensRenderer } from './lens_renderer';
import { lensVisualization } from './index.mock';

describe('LensRenderer', () => {
  const mockEmbeddableComponent = jest
    .fn()
    .mockReturnValue(<div data-test-subj="embeddableComponent" />);

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
    appMockRender.coreStart.lens.EmbeddableComponent = mockEmbeddableComponent;
  });

  it('renders the lens visualization correctly', () => {
    // @ts-expect-error: props are correct
    appMockRender.render(<LensRenderer {...lensVisualization} />);

    expect(screen.getByTestId('embeddableComponent')).toBeInTheDocument();
  });

  it('renders the lens visualization with correct attributes', () => {
    // @ts-expect-error: props are correct
    appMockRender.render(<LensRenderer {...lensVisualization} />);

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
    // @ts-expect-error: props are correct
    appMockRender.render(<LensRenderer {...lensVisualization} attributes={undefined} />);

    expect(screen.queryByTestId('embeddableComponent')).not.toBeInTheDocument();
  });

  it('renders the lens visualization with description', () => {
    appMockRender.render(
      // @ts-expect-error: props are correct
      <LensRenderer {...lensVisualization} metadata={{ description: 'description' }} />
    );

    expect(screen.getByText('description')).toBeInTheDocument();
  });
});
