/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { getServices } from '../services';
import { useCustomContentHtml } from '../hooks/use_custom_content_html';
import { CustomContentComponent } from './custom_content_component';

jest.mock('../services', () => ({ getServices: jest.fn() }));
jest.mock('../hooks/use_custom_content_html', () => ({ useCustomContentHtml: jest.fn() }));

const mockUseCustomContentHtml = useCustomContentHtml as jest.MockedFunction<
  typeof useCustomContentHtml
>;

const defaultProps = {
  embeddableId: 'panel-1',
  esqlQuery: undefined,
  timeRange: undefined,
  generationVersion: 0,
  savedTemplate: '<p>hi</p>',
  isApproximate: false,
  projectRouting: undefined,
  query: undefined,
  filters: undefined,
  esqlVariables: undefined,
  previewHtml: null,
  onLoadingChange: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getServices as jest.Mock).mockReturnValue({});
  mockUseCustomContentHtml.mockReturnValue({
    html: '<p>hi</p>',
    isLoading: false,
    error: undefined,
    noContent: false,
  });
});

describe('CustomContentComponent', () => {
  // Screenshotting waits for `[data-shared-item]` to reach the dashboard's panel count before
  // capturing; without it a report waits the full render timeout on every export.
  it('marks its root as a shared item so reporting can count it', () => {
    const { container } = render(<CustomContentComponent {...defaultProps} />);
    expect(container.querySelector('[data-shared-item]')).not.toBeNull();
  });

  it('reports loading state to the panel', () => {
    const onLoadingChange = jest.fn();
    mockUseCustomContentHtml.mockReturnValue({
      html: '',
      isLoading: true,
      error: undefined,
      noContent: false,
    });

    render(<CustomContentComponent {...defaultProps} onLoadingChange={onLoadingChange} />);

    expect(onLoadingChange).toHaveBeenCalledWith(true);
  });
});
